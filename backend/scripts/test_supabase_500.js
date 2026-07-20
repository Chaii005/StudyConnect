const https = require('https');

const url = 'https://izjbwiayemzdnnzxtmty.supabase.co/rest/v1/messages?sender_id=eq.38&receiver_id=eq.1&group_id=is.null';
const apikey = 'sb_publishable_PqIQeEqRzIIE2uIy3N0oLQ_ZjUhaVpu';

const options = {
  headers: {
    'apikey': apikey,
    'Authorization': `Bearer ${apikey}`
  }
};

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
  console.error('Error:', err.message);
});
