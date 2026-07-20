const { Client } = require('pg');
const https = require('https');

const supabaseUrl = 'https://izjbwiayemzdnnzxtmty.supabase.co';
const apiKey = 'sb_publishable_PqIQeEqRzIIE2uIy3N0oLQ_ZjUhaVpu';
const email = 'testuser_1784465584520@test.com';
const password = 'TestPassword123!';

const client = new Client({
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.izjbwiayemzdnnzxtmty',
  password: 'vanhai005Database2026',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(url, headers) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    }).on('error', reject);
  });
}

function patch(url, headers, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  await client.connect();
  console.log('Connected to PG.');
  try {
    console.log(`Confirming user: ${email} in SQL...`);
    const updateRes = await client.query(`
      UPDATE auth.users
      SET email_confirmed_at = NOW(), last_sign_in_at = NOW()
      WHERE email = $1;
    `, [email]);
    console.log(`Updated row count in auth.users: ${updateRes.rowCount}`);

    const pUserRes = await client.query('SELECT id FROM public.users WHERE email = $1', [email]);
    if (pUserRes.rowCount === 0) {
      console.log('Inserting user into public.users...');
      await client.query(`
        INSERT INTO public.users (email, full_name, role, password)
        VALUES ($1, 'Test User Auth', 'user', 'no_password_needed_via_supabase')
      `, [email]);
    }
  } catch (err) {
    console.error('SQL Update Error:', err);
    await client.end();
    return;
  }
  await client.end();

  try {
    console.log('Logging in to Supabase Auth API...');
    const loginRes = await post(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      { 'apikey': apiKey },
      { email, password }
    );

    console.log(`Login status: ${loginRes.statusCode}`);
    const loginBody = JSON.parse(loginRes.body);
    if (!loginBody.access_token) {
      console.error('Login failed:', loginBody);
      return;
    }

    const token = loginBody.access_token;
    console.log('Login successful. Obtained authenticated JWT.');

    const headers = {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`
    };

    console.log('\n--- 1. Testing GET /rest/v1/messages with JWT ---');
    const getUrl = `${supabaseUrl}/rest/v1/messages?select=id,sender_id,content,meetroom_id,created_at,users:users!sender_id(full_name,avatar)&sender_id=eq.38&meetroom_id=is.null`;
    const getRes = await get(getUrl, headers);
    console.log(`GET status: ${getRes.statusCode}`);
    console.log('GET response:', getRes.body);

    console.log('\n--- 2. Testing PATCH /rest/v1/messages with JWT ---');
    const patchUrl = `${supabaseUrl}/rest/v1/messages?id=eq.225`;
    const patchRes = await patch(patchUrl, headers, { is_read: true });
    console.log(`PATCH status: ${patchRes.statusCode}`);
    console.log('PATCH response:', patchRes.body);

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
