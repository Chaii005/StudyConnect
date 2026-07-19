// backend/scripts/inspect_tokens.js
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected.');

    const res = await client.query(`
      SELECT upt.id, upt.user_id, u.full_name, upt.device_token, upt.platform, upt.created_at
      FROM user_push_tokens upt
      LEFT JOIN users u ON upt.user_id = u.id;
    `);

    console.log(`Found ${res.rows.length} push tokens:`);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
