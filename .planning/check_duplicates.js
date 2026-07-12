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

    console.log('\n--- Checking for duplicate emails in public.users ---');
    const emailRes = await client.query("SELECT id, email, supabase_uid, full_name FROM users WHERE email = 'haihuynhvan2802@gmail.com'");
    console.log(emailRes.rows);

    console.log('\n--- Checking for duplicate UIDs in public.users ---');
    const uidRes = await client.query("SELECT id, email, supabase_uid, full_name FROM users WHERE supabase_uid = 'e2cb8158-04f4-4abe-bbf6-75c024f604d3'");
    console.log(uidRes.rows);

    console.log('\n--- Checking all rows in auth.users matching email ---');
    const authRes = await client.query("SELECT id, email, raw_app_meta_data FROM auth.users WHERE email = 'haihuynhvan2802@gmail.com'");
    console.log(authRes.rows);

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}

run();
