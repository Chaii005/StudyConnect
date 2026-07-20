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
      SELECT routine_name, routine_schema, specific_name, data_type 
      FROM information_schema.routines 
      WHERE routine_schema = 'net' AND routine_name = 'http_post'
    `);
    console.log('Found net.http_post routines:', res.rows);

    const args = await client.query(`
      SELECT parameter_name, data_type, parameter_mode 
      FROM information_schema.parameters 
      WHERE specific_schema = 'net' AND specific_name LIKE '%http_post%'
      ORDER BY ordinal_position
    `);
    console.log('Parameters:');
    console.table(args.rows);
  } catch (err) {
    console.error('Error:', err);
  }
  await client.end();
}

run();
