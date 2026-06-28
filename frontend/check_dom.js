import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    console.log('Logging in...');
    await page.type('input[type="email"]', 'thuyb@gmail.com');
    await page.type('input[type="password"]', 'User123!');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for groups page...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.goto('http://localhost:5173/groups', { waitUntil: 'networkidle2' });
    
    console.log('Opening Create Group Modal...');
    const buttons = await page.$$('button');
    let createBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Tạo nhóm') || text.includes('Tạo Nhóm')) {
        createBtn = btn;
        break;
      }
    }
    await createBtn.click();
    await page.waitForSelector('button');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Clicking Học Online card...');
    const step1ButtonsOnline = await page.$$('button');
    let onlineCard = null;
    for (const btn of step1ButtonsOnline) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Học Online')) {
        onlineCard = btn;
        break;
      }
    }
    await onlineCard.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Scroll container to bottom in Online mode
    console.log('Scrolling down in Online mode...');
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const scrollContainer = divs.find(d => d.style.overflowY === 'auto' && d.style.display === 'flex');
      if (scrollContainer) {
        scrollContainer.scrollTop = 300; // scroll down
        console.log('Scrolled online container scrollTop to:', scrollContainer.scrollTop);
      } else {
        console.log('Scroll container not found in Online mode');
      }
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Go back to step 1
    console.log('Clicking back button (←)...');
    const step2Buttons = await page.$$('button');
    let backBtn = null;
    for (const btn of step2Buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text === '←') {
        backBtn = btn;
        break;
      }
    }
    if (backBtn) {
      await backBtn.click();
    } else {
      throw new Error('Back button not found');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click Offline card
    console.log('Clicking Học Offline card...');
    const step1ButtonsOffline = await page.$$('button');
    let offlineCard = null;
    for (const btn of step1ButtonsOffline) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Học Offline')) {
        offlineCard = btn;
        break;
      }
    }
    if (offlineCard) {
      await offlineCard.click();
    } else {
      throw new Error('Offline card not found');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Measure scroll position in Offline mode
    const offlineMetrics = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const scrollContainer = divs.find(d => d.style.overflowY === 'auto' && d.style.display === 'flex');
      if (!scrollContainer) return { error: 'Scroll container not found' };
      
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const scrollTop = scrollContainer.scrollTop;
      
      const nameInput = document.querySelector('input[placeholder="Nhập tên nhóm học của bạn"]');
      const descTextarea = document.querySelector('textarea');
      const locInput = document.querySelector('input[placeholder="Nhập tên quán quán cà phê, thư viện..."]');
      
      const nameRect = nameInput ? nameInput.getBoundingClientRect().toJSON() : null;
      const descRect = descTextarea ? descTextarea.getBoundingClientRect().toJSON() : null;
      const locRect = locInput ? locInput.getBoundingClientRect().toJSON() : null;
      
      return {
        scrollHeight,
        clientHeight,
        scrollTop,
        nameRect,
        descRect,
        locRect
      };
    });
    
    console.log('Offline Metrics after transition:', JSON.stringify(offlineMetrics, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
