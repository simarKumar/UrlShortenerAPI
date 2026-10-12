const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config/env');

async function initializeDatabase() {
  console.log(`Connecting to MySQL Server at ${config.db.host}:${config.db.port}...`);

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  try {
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying database schema...');
    await connection.query(schemaSql);
    console.log('Database and tables initialized successfully.');

    const [tables] = await connection.query('SHOW TABLES IN url_shortener;');
    console.log('Tables:');
    tables.forEach((row) => console.log(' -', Object.values(row)[0]));
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initializeDatabase();
