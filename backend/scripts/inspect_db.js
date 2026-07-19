// backend/scripts/inspect_db.js
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // 1. Check triggers on messages table
    console.log('\n--- Triggers on public.messages ---');
    const triggersRes = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'messages';
    `);
    console.log(triggersRes.rows);

    // 2. Check all http/webhook triggers
    console.log('\n--- All Triggers calling http/net/webhook functions ---');
    const webhookTriggersRes = await client.query(`
      SELECT trigger_name, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE action_statement LIKE '%http%' 
         OR action_statement LIKE '%net%'
         OR action_statement LIKE '%webhook%'
         OR action_statement LIKE '%supabase_functions%';
    `);
    console.log(webhookTriggersRes.rows);

    // 3. Check pg_net extension
    console.log('\n--- pg_net schema presence ---');
    const pgNetRes = await client.query(`
      SELECT nspname FROM pg_namespace WHERE nspname = 'net';
    `);
    console.log(pgNetRes.rows);

    // 4. Check if supabase_realtime publication contains messages
    console.log('\n--- Realtime Publications ---');
    const pubRes = await client.query(`
      SELECT pubname FROM pg_publication;
    `);
    console.log('Publications:', pubRes.rows);

    const pubTablesRes = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime';
    `);
    console.log('Tables in supabase_realtime:', pubTablesRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
