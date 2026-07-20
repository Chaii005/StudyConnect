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
      SELECT event_object_table, trigger_name, action_statement, action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `);
    console.log('Triggers:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  }
  await client.end();
}

run();
