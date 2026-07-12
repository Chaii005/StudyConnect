const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Manually parse .env file
const envPath = path.join(__dirname, '../backend/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const client = new Client({
  host: env.DB_HOST,
  port: parseInt(env.DB_PORT || '5432', 10),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Database successfully!');

    // 1. Check recent messages
    console.log('\n--- RECENT 5 MESSAGES ---');
    const msgRes = await client.query('SELECT id, sender_id, receiver_id, group_id, content, created_at FROM messages ORDER BY created_at DESC LIMIT 5');
    console.log(msgRes.rows);

    // 2. Check supabase triggers on messages
    console.log('\n--- TRIGGERS ON MESSAGES TABLE ---');
    const trigRes = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement, action_timing 
      FROM information_schema.triggers 
      WHERE event_object_table = 'messages'
    `);
    console.log(trigRes.rows);

    // 3. Check supabase webhooks (edge triggers / supabase functions / net hooks)
    console.log('\n--- SUPABASE WEBHOOKS/TRIGGERS ---');
    const webhookRes = await client.query(`
      SELECT tgname, tgtype, tgenabled, proname 
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE tgrelid = 'messages'::regclass
    `);
    console.log(webhookRes.rows);

    // 4. Check user_push_tokens table (for FCM tokens)
    console.log('\n--- PUSH TOKENS COUNT ---');
    const tokenRes = await client.query('SELECT count(*), max(created_at) FROM user_push_tokens');
    console.log(tokenRes.rows);

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}

run();
