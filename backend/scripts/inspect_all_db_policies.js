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
      SELECT tablename, policyname, roles, cmd, permissive, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    console.log(`Found ${res.rows.length} policies.`);
    for (const row of res.rows) {
      console.log(`\nTable: ${row.tablename} | Policy: ${row.policyname}`);
      console.log(`- Cmd: ${row.cmd} | Roles: ${row.roles} | Permissive: ${row.permissive}`);
      if (row.qual) console.log(`- USING: ${row.qual}`);
      if (row.with_check) console.log(`- WITH CHECK: ${row.with_check}`);
    }
  } catch (err) {
    console.error('Error:', err);
  }

  await client.end();
}

run().catch(console.error);
