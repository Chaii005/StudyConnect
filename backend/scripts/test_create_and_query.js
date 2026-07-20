const https = require('https');

const supabaseUrl = 'https://izjbwiayemzdnnzxtmty.supabase.co';
const apiKey = 'sb_publishable_PqIQeEqRzIIE2uIy3N0oLQ_ZjUhaVpu';

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
  const email = `testuser_${Date.now()}@test.com`;
  const password = 'TestPassword123!';

  try {
    console.log(`Signing up new user: ${email}...`);
    const signupRes = await post(
      `${supabaseUrl}/auth/v1/signup`,
      { 'apikey': apiKey },
      { email, password }
    );

    console.log(`Signup status: ${signupRes.statusCode}`);
    const signupBody = JSON.parse(signupRes.body);
    if (!signupBody.access_token) {
      console.error('Signup failed:', signupBody);
      return;
    }

    const token = signupBody.access_token;
    console.log('Signup successful. Access Token obtained.');

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
