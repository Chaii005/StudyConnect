// backend/scripts/inspect_func.js
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
      SELECT pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'supabase_functions' AND p.proname = 'http_request';
    `);

    if (res.rows.length > 0) {
      console.log(res.rows[0].def);
    } else {
      console.log('Function supabase_functions.http_request not found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
