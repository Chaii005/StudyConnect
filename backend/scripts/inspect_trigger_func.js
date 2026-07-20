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
      SELECT routine_definition, security_type
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = 'queue_notification';
    `);
    console.log('--- queue_notification definition ---');
    console.log(res.rows[0]);
  } catch (err) {
    console.error('Error:', err);
  }

  await client.end();
}

run().catch(console.error);
