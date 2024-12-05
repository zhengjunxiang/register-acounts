const puppeteer = require('puppeteer');
const fs = require('fs');

const { getPhoneNumber, getSmsCode } = require('./utils').default
const { smsAPI } = require('./const').default

// 读取账号信息
const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));

// 延迟函数
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

console.log('accounts', accounts);

async function selectDropdownOptionByIndex(page, triggerSelector, optionIndex) {
  // 点击下拉框触发器
  await page.click(triggerSelector);
  await delay(1000); // 等待下拉框内容显示

  // 等待下拉选项的容器加载
  const dropdownSelector = '.ant-select-dropdown';
  await page.waitForSelector(dropdownSelector);
  await delay(300)

  // 查找并点击指定索引的选项
  await page.evaluate((index, dropdownSelector) => {
    const dropdowns = document.querySelectorAll(dropdownSelector);
    const latestDropdown = dropdowns[dropdowns.length - 1]; // 找到最新显示的下拉框
    const options = Array.from(latestDropdown.querySelectorAll('.ant-select-item'));
    if (options[index]) {
      options[index].click();
    } else {
      throw new Error(`Option with index ${index} not found`);
    }
  }, optionIndex, dropdownSelector);

  await delay(500); // 等待选项被选中
}

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
      await delay(800); // 等待页面加载
      await page.waitForSelector('.tnh-sign-up')
      await page.click('.tnh-sign-up')

      try {
        await page.waitForSelector('.ant-radio-wrapper', { timeout: 6000 });
        // 选择 trade role
        await page.click('.ant-radio-wrapper:nth-child(2)');
      } catch (err) {
        console.error('元素未找到或超时:', err.message);
      }

      // 先获取手机号
      const apiKey = smsAPI;
      const country = 3; // 国家代码（0 表示任意国家）
      const service = 'hw'; // 平台服务标识
      const phoneInfo = await getPhoneNumber(apiKey, country, service);
      console.log(`手机号: ${phoneInfo.phone}, 订单ID: ${phoneInfo.id}`);

      await page.waitForSelector('input[name="email"]');

      // 填写表单信息
      await page.type('input[name="email"]', account.email, { delay: 100 });
      await page.type('input[name="password"]', account.password, { delay: 100 });
      await page.type('input[name="confirmPassword"]', account.password, { delay: 100 });
      await selectDropdownOptionByIndex(page, 'div[name=mobileArea]', 0);
      // 去除区号
      await page.type('input[name="mobile"]', phoneInfo.phone.replace(account.mobileArea, ''), { delay: 100 });
      await page.type('input[name="companyName"]', account.company, { delay: 100 });
      await page.type('input[name="firstName"]', account.firstName, { delay: 100 });
      await page.type('input[name="lastName"]', account.lastName, { delay: 100 });

      // 选择地址
      // 依次选择省、市、区下拉框的指定索引值
      await selectDropdownOptionByIndex(page, 'div[name=province]', 1); // 选择省的第2个选项
      await selectDropdownOptionByIndex(page, 'div[name=city]', 2);     // 选择市的第3个选项
      await selectDropdownOptionByIndex(page, 'div[name=area]', 3);     // 选择区的第4个选项
      await page.type('input[name="address"]', account.address, { delay: 100 });

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

      await page.waitForFunction(() => {
        const element = document.getElementById('nc_2_n1z');
        return element && element.classList.contains('btn_ok'); // 等待元素包含类名
      }, { timeout: 30000 }); // 设置超时时间（单位：毫秒）

      // 点击 I agree to
      await page.click('input[name="memberAgreement"]');
      // 提交表单
      await page.click('button.RP-form-submit');

      // 获取手机验证码
      const smsCode = await getSmsCode(apiKey, phoneInfo.id);
      console.log(`收到验证码: ${smsCode}`);

      await page.type('input[name="mobileVerifyCode"]', smsCode, { delay: 100 });

      // console.log(`账号 ${account.email} 注册完成！`);
    } catch (err) {
      console.error(`注册账号 ${account.email} 失败:`, err);
    }
  }
  // await browser.close();
})();
