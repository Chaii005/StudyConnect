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
  console.log('Connected to PG.');

  try {
    const res = await client.query(`
      SELECT id, email, confirmed_at, last_sign_in_at
      FROM auth.users
      LIMIT 10;
    `);
    console.log('--- auth.users ---');
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  }

  await client.end();
}

run().catch(console.error);
