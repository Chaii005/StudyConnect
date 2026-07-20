// backend/scripts/test_worker_run.js
require('dotenv').config();
const { connectDB } = require('../src/config/database');
const { pollAndProcess } = require('../src/services/notificationQueueWorker');

async function run() {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Running pollAndProcess()...');
  await pollAndProcess('test-script');
  console.log('Done.');
}

run().catch(console.error);
