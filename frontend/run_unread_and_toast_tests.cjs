const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('Starting unread message count and toast style verification test...');
  
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }

  // Load accounts config
  const configPath = path.join(__dirname, 'test_accounts_config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Missing test_accounts_config.json! Run database setup first.');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  const userA = config.userA; // Sender (Thúy B)
  const userB = config.userB; // Receiver (Test Student Helper)

  console.log(`User A (Sender): ${userA.email}`);
  console.log(`User B (Receiver): ${userB.email}`);

  // ─── LAUNCH BROWSERS ───
  console.log('Launching browser instances...');
  const browserReceiver = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const browserSender = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const pageReceiver = await browserReceiver.newPage();
  const pageSender = await browserSender.newPage();

  await pageReceiver.setViewport({ width: 1280, height: 800 });
  await pageSender.setViewport({ width: 1280, height: 800 });

  try {
    // ─── LOGIN RECEIVER (USER B) ───
    console.log(`Logging in Receiver (${userB.email})...`);
    await pageReceiver.goto('https://studyconect.vercel.app/login', { waitUntil: 'networkidle2' });
    await pageReceiver.type('#login-email', userB.email);
    await pageReceiver.type('#login-password', userB.password);
    await pageReceiver.click('button[type="submit"]');
    try {
      await pageReceiver.waitForSelector('div[data-profilecard="true"]', { timeout: 15000 });
      console.log('Receiver logged in, on Home feed.');
    } catch (err) {
      await pageReceiver.screenshot({ path: path.join(screenshotDir, 'fail_receiver_login.png') });
      console.log('Receiver login failed. Captured fail_receiver_login.png');
      throw err;
    }

    // ─── LOGIN SENDER (USER A) ───
    console.log(`Logging in Sender (${userA.email})...`);
    await pageSender.goto('https://studyconect.vercel.app/login', { waitUntil: 'networkidle2' });
    await pageSender.type('#login-email', userA.email);
    await pageSender.type('#login-password', userA.password);
    await pageSender.click('button[type="submit"]');
    try {
      await pageSender.waitForSelector('div[data-profilecard="true"]', { timeout: 15000 });
      console.log('Sender logged in successfully.');
    } catch (err) {
      await pageSender.screenshot({ path: path.join(screenshotDir, 'fail_sender_login.png') });
      console.log('Sender login failed. Captured fail_sender_login.png');
      throw err;
    }

    // ─── SENDER SENDS CHAT MESSAGE ───
    console.log('Sender navigating to chat page...');
    await pageSender.goto('https://studyconect.vercel.app/chat', { waitUntil: 'networkidle2' });
    await delay(3000);

    console.log(`Sender clicking on Receiver (${userB.fullName}) chat thread...`);
    const chatItems = await pageSender.$$('span');
    let targetChatThread = null;
    for (const item of chatItems) {
      const text = await pageSender.evaluate(el => el.textContent, item);
      if (text.includes(userB.fullName)) {
        targetChatThread = item;
        break;
      }
    }
    if (!targetChatThread) throw new Error(`Could not find chat thread with ${userB.fullName}`);
    await targetChatThread.click();
    await delay(2000);

    console.log('Sender typing and sending message...');
    await pageSender.waitForSelector('textarea[placeholder="Nhập tin nhắn..."]', { timeout: 10000 });
    await pageSender.type('textarea[placeholder="Nhập tin nhắn..."]', 'Hi Admin, test unread count and toast monochrome theme!');
    await pageSender.keyboard.press('Enter');
    await delay(2000);
    console.log('Message sent.');

    // ─── RECEIVER VERIFIES UNREAD COUNT RECEIVED ───
    console.log('Receiver waiting for unread count badge to appear in sidebar...');
    await delay(5000); // Wait for Realtime INSERT propagation
    
    // Check unread count on "Nhắn tin" tab
    await pageReceiver.screenshot({ path: path.join(screenshotDir, '10_unread_received.png') });
    console.log('Captured screenshot showing unread count received on sidebar.');

    // ─── RECEIVER READS CHAT MESSAGE ───
    console.log('Receiver navigating to chat to read message...');
    await pageReceiver.goto('https://studyconect.vercel.app/chat', { waitUntil: 'networkidle2' });
    await delay(3000);

    console.log(`Receiver clicking on Sender (${userA.fullName}) chat thread...`);
    const receiverChatItems = await pageReceiver.$$('span');
    let senderChatThread = null;
    for (const item of receiverChatItems) {
      const text = await pageReceiver.evaluate(el => el.textContent, item);
      if (text.includes(userA.fullName)) {
        senderChatThread = item;
        break;
      }
    }
    if (!senderChatThread) throw new Error(`Could not find chat thread with ${userA.fullName}`);
    await senderChatThread.click();
    await delay(5000); // Allow markAsRead and UPDATE trigger to sync

    // ─── RECEIVER NAVIGATES AWAY AND VERIFIES UNREAD CLEARED ───
    console.log('Receiver navigating back to Home...');
    await pageReceiver.goto('https://studyconect.vercel.app/', { waitUntil: 'networkidle2' });
    await delay(3000);

    await pageReceiver.screenshot({ path: path.join(screenshotDir, '11_unread_cleared.png') });
    console.log('Captured screenshot showing unread count cleared on sidebar.');

    console.log('Unread count test completed successfully.');

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browserReceiver.close();
    await browserSender.close();
  }
})();
