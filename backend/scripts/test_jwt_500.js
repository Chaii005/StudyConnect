const https = require('https');

const supabaseUrl = 'https://izjbwiayemzdnnzxtmty.supabase.co';
const apiKey = 'sb_publishable_PqIQeEqRzIIE2uIy3N0oLQ_ZjUhaVpu';

function get(path, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = `${supabaseUrl}${path}`;
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'apikey': apiKey,
        ...extraHeaders
      }
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
  console.log('Test 1: Bad Authorization header');
  const res1 = await get('/rest/v1/messages?select=id&limit=1', { 'Authorization': 'Bearer bad_token_123' });
  console.log('Bad token res:', res1.statusCode, res1.body);

  console.log('Test 2: Anon query without Auth header');
  const res2 = await get('/rest/v1/messages?select=id,sender_id,receiver_id,content,file_attachment,is_read,created_at&group_id=is.null&or=(and(sender_id.eq.16,receiver_id.eq.38),and(sender_id.eq.38,receiver_id.eq.16))&order=created_at.asc');
  console.log('Anon query res:', res2.statusCode, res2.body);
}

run().catch(console.error);
