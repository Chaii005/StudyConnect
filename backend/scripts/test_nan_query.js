const https = require('https');

const supabaseUrl = 'https://izjbwiayemzdnnzxtmty.supabase.co';
const apiKey = 'sb_publishable_PqIQeEqRzIIE2uIy3N0oLQ_ZjUhaVpu';

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
  const headers = { 'apikey': apiKey };

  console.log('--- Testing PostgREST with NaN in integer column ---');
  const testUrl = `${supabaseUrl}/rest/v1/messages?select=id,sender_id,receiver_id,content,file_attachment,is_read,created_at&group_id=is.null&or=(and(sender_id.eq.NaN,receiver_id.eq.16),and(sender_id.eq.16,receiver_id.eq.NaN))&order=created_at.asc`;
  
  const res = await get(testUrl, headers);
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Response Body:', res.body);
}

run().catch(console.error);
