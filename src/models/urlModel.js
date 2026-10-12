const pool = require('../config/database');

async function create(longUrl) {
  const [result] = await pool.execute(
    'INSERT INTO urls (short_code, long_url) VALUES (?, ?)',
    ['', longUrl]
  );
  return result.insertId;
}

async function updateShortCode(id, shortCode) {
  await pool.execute(
    'UPDATE urls SET short_code = ? WHERE id = ?',
    [shortCode, id]
  );
}

async function findByShortCode(shortCode) {
  const [rows] = await pool.execute(
    'SELECT id, short_code, long_url, created_at FROM urls WHERE short_code = ?',
    [shortCode]
  );
  return rows[0] || null;
}

async function findByLongUrl(longUrl) {
  const [rows] = await pool.execute(
    'SELECT id, short_code, long_url, created_at FROM urls WHERE long_url = ?',
    [longUrl]
  );
  return rows[0] || null;
}

module.exports = { create, updateShortCode, findByShortCode, findByLongUrl };
