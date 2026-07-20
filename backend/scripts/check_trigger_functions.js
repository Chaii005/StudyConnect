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
      SELECT routine_name, routine_definition 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND (routine_definition LIKE '%http%' OR routine_name LIKE '%push%' OR routine_name LIKE '%notification%')
    `);
    console.log('Found functions:');
    res.rows.forEach(r => {
      console.log('--- FUNCTION:', r.routine_name);
      console.log(r.routine_definition);
    });
  } catch (err) {
    console.error('Error:', err);
  }
  await client.end();
}

run();
