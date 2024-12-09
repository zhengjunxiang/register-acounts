const puppeteer = require('puppeteer-core');
const fs = require('fs');
const logger = require('./logger'); // 引入日志模块
const { getTempEmail, checkEmail, getRandomNumber } = require('./utils').default;

const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));

// 延迟函数
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

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
    await page.mouse.move(endX, startY, { steps: getRandomNumber(5, 20) });
    await delay(getRandomNumber(300, 600));
    await page.mouse.up();

    await page.waitForFunction(() => {
      const element = document.getElementById('nc_2_n1z');
      return element && element.classList.contains('btn_ok');
    }, { timeout: 30000 });
  } catch (err) {
    logger.error('滑块验证失败: ' + err.message);
    throw err;
  }
}

async function handleVerification(page, email) {
  try {
    const verificationCode = await checkEmail(email);
    if (verificationCode) {
      await page.type('input[name="emailVerifyCode"]', verificationCode, { delay: 100 });
      await delay(600);
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
    executablePath: chromePath, // 使用检测到的 Chrome 路径
    userDataDir: './user_data',  // 指定持久化存储目录
    defaultViewport: { width: 1280, height: 1024 },
  });


  for (const account of accounts) {
    try {
      let page = await browser.newPage();
      // await page.goto('https://ug.alibaba.com/', { waitUntil: 'networkidle2' });
      // await delay(2000)
      // await page.waitForSelector("input[name='account']")
      // await page.waitForSelector("input[name='password']")
      // await page.type("input[name='account']", 'mu7vq3zh6c1@rteet.com', { delay: 100 })
      // await page.type("input[name='password']", 'Password123', { delay: 100 })
      // await delay(1000)
      // await page.click("button.sif_form-submit")
      // return;
      await navigateToRegistrationPage(page);

      const email = await getTempEmail();
      logger.info(`使用临时邮箱注册: ${email}`);

      await delay(1000);

      await fillRegistrationForm(page, account, email);
      await handleSlider(page);

      await delay(1000)
      await page.waitForSelector('input[name="memberAgreement"]');
      await page.click('input[name="memberAgreement"]');
      await page.click('button.RP-form-submit');

      await handleVerification(page, email);

      // 点击注册
      await page.click('.RP-modal-item:nth-child(3) button.RP-modal-button');
      logger.info(`账号 ${email} 注册成功！`);
      await delay(5000)
      // 等待登录完成
      await await page.waitForSelector('.tnh-loggedin .tnh-ma');
      await delay(5000)

      // 跳转到 ug 进行用户设置
      await page.goto('https://ug.alibaba.com/?wx_navbar_transparent=true', { waitUntil: 'networkidle2' });
      await delay(1000)
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
