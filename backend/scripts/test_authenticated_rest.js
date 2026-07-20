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

async function run() {
  try {
    console.log('Logging in as thuyb@gmail.com...');
    const loginRes = await post(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      { 'apikey': apiKey },
      { email: 'thuyb@gmail.com', password: 'User123!' }
    );

    console.log(`Login status: ${loginRes.statusCode}`);
    const loginBody = JSON.parse(loginRes.body);
    if (!loginBody.access_token) {
      console.error('Login failed:', loginBody);
      return;
    }

    const token = loginBody.access_token;
    console.log('Login successful. Obtained JWT token.');

    const headers = {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`
    };

    console.log('\n--- 1. Testing GET /rest/v1/messages ---');
    const getUrl = `${supabaseUrl}/rest/v1/messages?select=id,sender_id,content,meetroom_id,created_at,users:users!sender_id(full_name,avatar)&sender_id=eq.38&meetroom_id=is.null`;
    const getRes = await get(getUrl, headers);
    console.log(`GET status: ${getRes.statusCode}`);
    console.log('GET response:', getRes.body);

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
