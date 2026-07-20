const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.izjbwiayemzdnnzxtmty',
  password: 'vanhai005Database2026',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT name, default_version, installed_version 
      FROM pg_available_extensions 
      WHERE name = 'pg_net' OR name = 'http'
    `);
    console.log('Extensions:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  }
  await client.end();
}

run();
