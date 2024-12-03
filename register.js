const puppeteer = require('puppeteer');
const fs = require('fs');

// 读取账号信息
const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));

// 延迟函数
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

console.log('accounts', accounts);

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1280,
      height: 1024
    },
  }); // 设置 headless: true 可以无界面运行
  const page = await browser.newPage();

  for (const account of accounts) {
    try {
      console.log(`开始注册账号：${account.email}`);
      // 进入首页，点击注册按钮
      await page.goto('https://alibaba.com/', { waitUntil: "domcontentloaded" });
      await delay(1000); // 等待页面加载
      await page.waitForSelector('.tnh-sign-up')
      await page.click('.tnh-sign-up')

      // 选择 trade role
      await page.waitForSelector('.ant-radio-wrapper:nth-child(2)');
      await page.click('.ant-radio-wrapper:nth-child(2)');

      await page.waitForSelector('input[name="email"]');
      // 填写表单信息
      await page.type('input[name="email"]', account.email, { delay: 100 });
      await page.type('input[name="password"]', account.password, { delay: 100 });
      await page.type('input[name="confirmPassword"]', account.password, { delay: 100 });
      await page.type('input[name="companyName"]', account.company, { delay: 100 });
      await page.type('input[name="firstName"]', account.firstName, { delay: 100 });
      await page.type('input[name="lastName"]', account.lastName, { delay: 100 });

      // 选择地址
      // const countrySelector = 'select[name="country"]';
      // await page.select(countrySelector, account.country);

      // 处理滑动条
      // 等待滑块加载
      await page.waitForSelector('#nc_2_n1z');
      // 定位滑块和滑块容器
      const sliderHandle = await page.$('#nc_2_n1z'); // 滑块
      const sliderContainer = await page.$('#nc_2_wrapper'); // 滑块的容器
      // 获取滑块的位置和宽度
      const sliderBox = await sliderHandle.boundingBox();
      const containerBox = await sliderContainer.boundingBox();
      const startX = sliderBox.x + sliderBox.width / 2; // 滑块的起始位置
      const startY = sliderBox.y + sliderBox.height / 2; // 滑块的垂直位置
      const endX = containerBox.x + containerBox.width - sliderBox.width / 2; // 滑块的目标位置
      // 模拟鼠标拖动
      await page.mouse.move(startX, startY); // 移动到滑块起始位置
      await page.mouse.down(); // 按下鼠标
      await page.mouse.move(endX, startY, { steps: 30 }); // 滑动到目标位置（步数可以调整）
      await page.mouse.up(); // 松开鼠标

      // 点击 I agree to
      await page.click('input[name="memberAgreement"]');

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
