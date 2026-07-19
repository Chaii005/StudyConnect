// backend/scripts/ping_render.js
const https = require('https');

console.log('Sending request to Render server...');
const req = https.request('https://studyconnect-backend-ylyu.onrender.com/api/health', {
  method: 'GET',
  timeout: 45000
}, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.on('timeout', () => {
  console.log('Request timed out.');
  req.destroy();
});

req.end();
