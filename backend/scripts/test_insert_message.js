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
    console.log('Inserting test message...');
    const res = await client.query(`
      INSERT INTO public.messages (sender_id, receiver_id, content, is_read)
      VALUES (38, 1, 'Direct PG test message', false)
      RETURNING id, created_at;
    `);
    console.log('Insert succeeded:', res.rows[0]);
  } catch (err) {
    console.error('❌ Insert failed with error:', err);
  }

  await client.end();
}

run().catch(console.error);
