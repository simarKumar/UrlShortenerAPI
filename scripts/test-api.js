const { spawn } = require('child_process');
const path = require('path');

async function main() {
  console.log('Starting test server...');

  const serverProcess = spawn('node', [path.join(__dirname, '../src/app.js')], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolve) => setTimeout(resolve, 2500));

  const baseUrl = 'http://localhost:3000';

  async function api(endpoint, options = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    return res;
  }

  try {
    console.log('Running test suite...');

    // Test 1: Swagger UI
    const docsRes = await api('/api-docs/');
    console.log(`[PASS] GET /api-docs/ (${docsRes.status})`);

    // Test 2: Validation on empty payload
    const emptyRes = await api('/api/shorten', { method: 'POST', body: JSON.stringify({}) });
    if (emptyRes.status !== 400) throw new Error('Expected 400 on empty payload');
    console.log('[PASS] POST /api/shorten validation (400)');

    // Test 3: Validation on invalid URL
    const badUrlRes = await api('/api/shorten', { method: 'POST', body: JSON.stringify({ longUrl: 'not-a-url' }) });
    if (badUrlRes.status !== 400) throw new Error('Expected 400 on invalid URL');
    console.log('[PASS] POST /api/shorten bad format (400)');

    // Test 4: URL shortening
    const shortenRes = await api('/api/shorten', {
      method: 'POST',
      body: JSON.stringify({ longUrl: 'https://github.com/simarKumar' }),
    });
    if (shortenRes.status !== 201) throw new Error('Expected 201 on valid URL');
    const shortenData = await shortenRes.json();
    const shortCode = shortenData.data?.shortCode;
    console.log(`[PASS] POST /api/shorten created short code: ${shortCode} (201)`);

    // Test 5: Idempotent duplication
    const dupRes = await api('/api/shorten', {
      method: 'POST',
      body: JSON.stringify({ longUrl: 'https://github.com/simarKumar' }),
    });
    const dupData = await dupRes.json();
    if (dupData.data?.shortCode !== shortCode) throw new Error('Duplicate URL returned different short code');
    console.log('[PASS] POST /api/shorten idempotency check');

    // Test 6: 302 Redirection
    const redirectRes = await fetch(`${baseUrl}/${shortCode}`, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 TestBrowser',
        'Referer': 'https://linkedin.com/in/simarkumar',
      },
    });
    if (redirectRes.status !== 302) throw new Error('Expected 302 redirect');
    console.log(`[PASS] GET /${shortCode} redirected to: ${redirectRes.headers.get('location')} (302)`);

    await new Promise((r) => setTimeout(r, 600));

    // Test 7: Analytics
    const analyticsRes = await api(`/api/analytics/${shortCode}`);
    if (analyticsRes.status !== 200) throw new Error('Expected 200 on analytics');
    const analyticsData = await analyticsRes.json();
    console.log(`[PASS] GET /api/analytics/${shortCode} recorded clicks: ${analyticsData.data.totalClicks}`);

    // Test 8: 404 for unknown code
    const notFoundRes = await fetch(`${baseUrl}/missingcode404`, { redirect: 'manual' });
    if (notFoundRes.status !== 404) throw new Error('Expected 404 for unknown code');
    console.log('[PASS] GET /missingcode404 returned 404');

    console.log('\nAll integration tests passed successfully.');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    serverProcess.kill();
  }
}

main();
