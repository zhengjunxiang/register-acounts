const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const logger = require('./logger'); // 引入日志模块
const { getTempEmail, checkEmail, getRandomNumber } = require('./utils').default;

const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));

// 延迟函数
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

// 启用 stealth 插件
puppeteer.use(stealthPlugin());

// 自动获取 Chrome 的路径
async function getChromePath() {
  try {
    const { Launcher } = await import('chrome-launcher');
    const installation = await Launcher.getInstallations();
    if (installation && installation.length > 0) {
      logger.info(`检测到 Chrome 安装路径: ${installation[0]}`);
      return installation[0];
    }
    throw new Error('未找到 Chrome 安装');
  } catch (err) {
    logger.error('检测 Chrome 安装路径失败: ' + err.message);
    return null;
  }
}

async function navigateToRegistrationPage(page) {
  try {
    await page.goto('https://alibaba.com/', { waitUntil: ['domcontentloaded', 'networkidle2'] });
    await page.waitForSelector('.tnh-button.tnh-sign-up');
    await page.click('.tnh-button.tnh-sign-up');
  } catch (err) {
    logger.error('导航到注册页面失败: ' + err.message);
    throw err;
  }
}

async function fillRegistrationForm(page, account, email) {
  try {
    // 选择国家：America
    await page.waitForSelector('div[name="countryCode"]', { timeout: 6000 });
    await page.click('div[name="countryCode"]');
    await page.type('div[name="countryCode"]', account.country, { delay: 100 });
    await page.click('.rc-virtual-list .ant-select-item.ant-select-item-option:nth-child(1)');
    // 选择 trade role
    await page.waitForSelector('.ant-radio-group .ant-radio-wrapper', { timeout: 6000 });
    await page.click('.ant-radio-group .ant-radio-wrapper:nth-child(1)');
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', email, { delay: 100 });
    await page.type('input[name="password"]', account.password, { delay: 100 });
    await page.type('input[name="confirmPassword"]', account.password, { delay: 100 });
    await page.type('input[name="companyName"]', account.company, { delay: 100 });
    await page.type('input[name="firstName"]', account.firstName, { delay: 100 });
    await page.type('input[name="lastName"]', account.lastName, { delay: 100 });
    await page.type('input[name="phoneAreaCode"]', account.phoneAreaCode, { delay: 100 });
    await page.type('input[name="phoneNumber"]', account.phoneNumber, { delay: 100 });
  } catch (err) {
    logger.error('填写注册表单失败: ' + err.message);
    throw err;
  }
}

async function handleSlider(page) {
  try {
    await page.waitForSelector('#xjoin_no_captcha .nc_wrapper .nc_scale .btn_slide');
    const sliderHandle = await page.$('#xjoin_no_captcha .nc_wrapper .nc_scale .btn_slide');
    const sliderContainer = await page.$('#xjoin_no_captcha .nc_wrapper');

    const sliderBox = await sliderHandle.boundingBox();
    const containerBox = await sliderContainer.boundingBox();

    const startX = sliderBox.x + sliderBox.width / 2;
    const startY = sliderBox.y + sliderBox.height / 2;
    const endX = containerBox.x + containerBox.width - sliderBox.width / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, startY, { steps: getRandomNumber(20, 30) });
    await delay(getRandomNumber(300, 600));
    await page.mouse.up();

    // 每秒检查一次，最多检查 10 次
    let success = false;
    for (attempt = 0; attempt < 10; attempt++) {
      success = await page.evaluate(() => {
        const successElement = document.querySelector('.nc_wrapper .btn_ok');
        return successElement !== null;
      });

      if (success) {
        console.log(`滑块验证成功 (第 ${attempt + 1} 次检查通过)`);
        return; // 成功后退出函数
      }

      console.log(`验证结果未通过，等待重试 (${attempt + 1}/10)...`);
      await delay(1000); // 每秒检查一次
    }

    if (!success) {
      throw new Error('滑块验证未通过，超过 10 次检查限制');
    }
  } catch (err) {
    logger.error('滑块验证失败: ' + err.message);
    throw err;
  }
}
// 输入邮箱验证码
async function handleVerification(page, email) {
  try {
    const verificationCode = await checkEmail(email);
    if (verificationCode) {
      await page.type('input[name="emailVerifyCode"]', verificationCode, { delay: 100 });
    }
  } catch (err) {
    logger.error('处理验证码失败: ' + err.message);
    throw err;
  }
}

(async () => {
  const chromePath = await getChromePath();
  if (!chromePath) {
    logger.error(
      '未检测到系统中已安装的 Chrome。请前往 https://www.google.com/chrome 下载并安装后再试。'
    );
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // 禁用自动化提示
      '--disable-infobars', // 禁用信息栏（提示 Chrome 正受到控制）
    ],
    executablePath: chromePath, // 使用检测到的 Chrome 路径
    // userDataDir: './user_data',  // 指定持久化存储目录
    defaultViewport: { width: 1440, height: 1024 },
  });


  for (const account of accounts) {
    try {
      let page = await browser.newPage();
      // 通过 evaluate 来禁用 WebDriver 检测
      // await page.evaluateOnNewDocument(() => {
      //   // 禁用 WebDriver 属性
      //   Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); // 防止检测到 webdriver
      //   // 模拟浏览器的其他属性
      //   Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      //   Object.defineProperty(navigator, 'plugins', { get: () => ['Chrome PDF Viewer', 'Native Client'] });
      // });
      // const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134';

      // await page.setUserAgent(userAgent);

      await navigateToRegistrationPage(page);

      const email = await getTempEmail();
      logger.info(`使用临时邮箱注册: ${email}`);

      await delay(1000);

      await fillRegistrationForm(page, account, email);
      await handleSlider(page);

      await page.waitForSelector('input[name="memberAgreement"]');
      await page.click('input[name="memberAgreement"]');
      await delay(1000)
      await page.click('button.RP-form-submit');

      await handleVerification(page, email);

      // 点击注册
      await delay(1000)
      await page.click('button.RP-modal-button');
      logger.info(`账号 ${email} 注册成功！`);

      // 等待登录完成
      await page.waitForSelector('.tnh-loggedin .tnh-ma');
      await delay(3000)
      // 跳转到 ug 进行用户设置
      await page.goto('https://ug.alibaba.com/?wx_navbar_transparent=true', { waitUntil: 'networkidle2' });
      // 登录操作
      await delay(3000)
      await page.waitForSelector("input[name='account']")
      await page.waitForSelector("input[name='password']")
      await page.type("input[name='account']", email, { delay: 100 })
      await page.type("input[name='password']", account.password, { delay: 100 })
      await delay(1000)
      await page.click("button.sif_form-submit")
      await delay(3000)

      await page.waitForSelector('.mb-header-wrapper .mb-header-button');
      await page.click('.mb-header-wrapper .mb-header-button');

      await page.waitForSelector('.upgradeToDialog .member-index-main .business-identify-group');
      await page.click('.business-identify-group .business-identify-type:last-child');
      await delay(600)
      await page.click('.upgradeToDialog .layout-footer .footer-button');
      await delay(500)

      // 下一步
      await page.type('input#street', 'sfdsdf', { delay: 100 });
      await page.type('input#province', 'sfdsdf', { delay: 100 });
      await page.type('input#city', 'sfdsdf', { delay: 100 });
      await page.waitForSelector('.upgradeToDialog .clause-box .fold-box .fold-box-checkbox');
      await delay(500)
      await page.click('.upgradeToDialog .layout-footer .footer-button');
    } catch (err) {
      logger.error(`账号注册失败: ${err.message}`);
    } finally {
      // await page.close();
    }
  }

  // await browser.close();
  logger.info('所有任务完成');
})();
