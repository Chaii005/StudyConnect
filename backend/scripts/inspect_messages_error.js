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
  console.log('Connected to DB.');

  try {
    console.log('Trying simple select on messages:');
    const res1 = await client.query('SELECT * FROM public.messages LIMIT 2;');
    console.log('Simple select success. Row count:', res1.rows.length);
  } catch (err) {
    console.error('Simple select failed:', err.message);
  }

  try {
    console.log('Trying join select on messages and users:');
    const res2 = await client.query(`
      SELECT m.id, m.sender_id, m.content, u.full_name, u.avatar
      FROM public.messages m
      LEFT JOIN public.users u ON m.sender_id = u.id
      LIMIT 2;
    `);
    console.log('Join select success. Row count:', res2.rows.length);
  } catch (err) {
    console.error('Join select failed:', err.message);
  }

  try {
    console.log('Checking for any broken functions or triggers:');
    const res3 = await client.query(`
      SELECT pg_catalog.pg_get_triggerdef(t.oid) as trigger_def, t.tgname, c.relname
      FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND NOT t.tgisinternal;
    `);
    console.log('Custom triggers found:', res3.rows.length);
    for (const row of res3.rows) {
      console.log(`- Table ${row.relname}, Trigger ${row.tgname}: ${row.trigger_def}`);
    }
  } catch (err) {
    console.error('Triggers query failed:', err.message);
  }

  await client.end();
}

run().catch(console.error);
