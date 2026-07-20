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
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, cmd;
    `);
    console.log(`Found ${res.rows.length} policies.`);
    for (const r of res.rows) {
      console.log(`\nTable: ${r.tablename} | Policy: ${r.policyname} | Cmd: ${r.cmd}`);
      console.log(`- Permissive: ${r.permissive}`);
      console.log(`- Roles: ${r.roles}`);
      console.log(`- Qual (USING): ${r.qual}`);
      console.log(`- With Check: ${r.with_check}`);
    }
  } catch (err) {
    console.error('Error querying policies:', err);
  }

  await client.end();
}

run().catch(console.error);
