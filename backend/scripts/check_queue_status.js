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
      SELECT status, count(*), array_agg(id ORDER BY id DESC) as latest_ids
      FROM public.notification_queue
      GROUP BY status
    `);
    console.log('Queue stats:', res.rows);

    const failed = await client.query(`
      SELECT id, table_name, op_type, attempts, error_message, created_at
      FROM public.notification_queue
      WHERE status = 'failed' OR status = 'pending'
      ORDER BY id DESC
      LIMIT 10
    `);
    console.log('Pending or failed jobs sample:', failed.rows);
  } catch (err) {
    console.error('Error running check query:', err);
  }

  await client.end();
}

run().catch(console.error);
