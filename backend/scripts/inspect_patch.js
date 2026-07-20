const https = require('https');

const url = 'https://izjbwiayemzdnnzxtmty.supabase.co/rest/v1/messages?id=eq.225';
const apiKey = 'sb_publishable_PqIQeEqRzIIE2uIy3N0oLQ_ZjUhaVpu';

const postData = JSON.stringify({
  is_read: true
});

const options = {
  method: 'PATCH',
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending PATCH request to PostgREST...');
const req = https.request(url, options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response Body:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (err) => {
  console.error('Error:', err);
});

req.write(postData);
req.end();
