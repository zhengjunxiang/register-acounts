const puppeteer = require('puppeteer');
const fs = require('fs');

// 读取账号信息
const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));

// 延迟函数
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

console.log('accounts', accounts);

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // 设置 headless: true 可以无界面运行
  const page = await browser.newPage();

  for (const account of accounts) {
    try {
      console.log(`开始注册账号：${account.email}`);
      await page.goto('https://alibaba.com/');

      // Set screen size.
      // await page.setViewport({width: 1280, height: 1024});

      // 点击 "Join Free" 按钮
      // await page.click('a[href*="join"]');
      await delay(1000); // 等待页面加载

      // 填写表单信息
      // await page.type('input[name="email"]', account.email, { delay: 100 });
      // await page.type('input[name="password"]', account.password, { delay: 100 });
      // await page.type('input[name="companyName"]', account.company, { delay: 100 });

      // 模拟选择国家（此步骤需根据实际 HTML 结构调整）
      // const countrySelector = 'select[name="country"]';
      // await page.select(countrySelector, account.country);
      await page.click('.tnh-sign-up')
      await delay(1000);

      // Wait and click on first result
      const searchResultSelector = '.ant-radio-wrapper:nth-child(2)';
      await page.waitForSelector(searchResultSelector);
      await page.click(searchResultSelector);

      // 提交表单
      // await page.click('button[type="submit"]');
      // await delay(5000); // 等待注册完成
      // console.log(`账号 ${account.email} 注册完成！`);
    } catch (err) {
      console.error(`注册账号 ${account.email} 失败:`, err);
    }
  }

  // await browser.close();
})();
