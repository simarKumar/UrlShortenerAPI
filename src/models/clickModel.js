const pool = require('../config/database');

async function recordClick(urlId, ip, userAgent, referrer) {
  await pool.execute(
    'INSERT INTO clicks (url_id, ip_address, user_agent, referrer) VALUES (?, ?, ?, ?)',
    [urlId, ip || null, userAgent || null, referrer || null]
  );
}

async function getTotalClicks(urlId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM clicks WHERE url_id = ?',
    [urlId]
  );
  return rows[0].total;
}

async function getClicksByDay(urlId) {
  const [rows] = await pool.execute(
    `SELECT DATE(clicked_at) AS date, COUNT(*) AS clicks
     FROM clicks
     WHERE url_id = ?
     GROUP BY DATE(clicked_at)
     ORDER BY date DESC
     LIMIT 30`,
    [urlId]
  );
  return rows;
}

async function getTopReferrers(urlId) {
  const [rows] = await pool.execute(
    `SELECT COALESCE(referrer, 'direct') AS referrer, COUNT(*) AS clicks
     FROM clicks
     WHERE url_id = ?
     GROUP BY referrer
     ORDER BY clicks DESC
     LIMIT 10`,
    [urlId]
  );
  return rows;
}

module.exports = { recordClick, getTotalClicks, getClicksByDay, getTopReferrers };
