const https = require('https');

const url = 'https://izjbwiayemzdnnzxtmty.supabase.co/rest/v1/messages?select=id,sender_id,content,meetroom_id,created_at,users:users!sender_id(full_name,avatar)&sender_id=eq.38&meetroom_id=is.null';
const apiKey = 'sb_publishable_PqIQeEqRzIIE2uIy3N0oLQ_ZjUhaVpu';

const options = {
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`
  }
};

console.log('Sending request to PostgREST...');
https.get(url, options, (res) => {
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
}).on('error', (err) => {
  console.error('Error:', err);
});
