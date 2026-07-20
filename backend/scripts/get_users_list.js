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
  console.log('Connected.');
  try {
    const res = await client.query('SELECT id, email, role, full_name FROM public.users LIMIT 10;');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
  await client.end();
}

run();
