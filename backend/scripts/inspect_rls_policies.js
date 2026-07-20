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

  // 1. Check RLS status
  const rlsRes = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename IN ('messages', 'notification_queue', 'app_settings');
  `);
  console.log('--- RLS Status ---');
  console.log(rlsRes.rows);

  // 2. Check policies on messages
  const policiesRes = await client.query(`
    SELECT * 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'messages';
  `);
  console.log('--- RLS Policies on messages ---');
  console.log(policiesRes.rows);

  // 3. Check policies on notification_queue
  const queuePolRes = await client.query(`
    SELECT * 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'notification_queue';
  `);
  console.log('--- RLS Policies on notification_queue ---');
  console.log(queuePolRes.rows);

  // 4. Check policies on app_settings
  const appSettingsPolRes = await client.query(`
    SELECT * 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'app_settings';
  `);
  console.log('--- RLS Policies on app_settings ---');
  console.log(appSettingsPolRes.rows);

  await client.end();
}

run().catch(console.error);
