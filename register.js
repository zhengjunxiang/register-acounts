const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
// const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const fs = require('fs');
const logger = require('./logger'); // 引入日志模块
const { getTempEmail, checkEmail, getRandomNumber } = require('./utils').default;

const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));

// 延迟函数
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

// 启用 stealth 插件
puppeteer.use(stealthPlugin());
// puppeteer.use(AdblockerPlugin());

// 自动获取 Chrome 的路径
async function getChromePath() {
  try {
    const { Launcher } = await import('chrome-launcher');
    const installation = await Launcher.getInstallations();
    if (installation && installation.length > 0) {
      // logger.info(`检测到 Chrome 安装路径: ${installation[0]}`);
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
    ignoreHTTPSErrors: true,
    args: [
      '--window-size=1440,1024',
      // '--enable-automation', // 取消自动打开的空白页
      // '--disable-features=IsolateOrigins,site-per-process',
      // IsolateOrigins：默认启用该功能时，Chromium 会将不同源的内容隔离到不同的进程中。这是为了增强安全性，但有时会影响页面加载或性能。
      // site-per-process：禁用每个站点每个进程的隔离，可能有助于性能优化。
      '--disable-blink-features=AutomationControlled', // 禁用自动化提示
      '--disable-infobars', // 隐藏“Chrome 正在受自动化软件控制”提示条。
      '--blink-settings=imagesEnabled=true',
      "--no-sandbox", // 使用沙盒模式
      "--disable-setuid-sandbox", // 禁用setuid沙盒（仅限Linux）
      "--disable-extensions", // 禁用扩展
      "--incognito", // 启用无痕模式，减少浏览器状态干扰。
      // "--disable-gpu", // 禁用 GPU 加速（主要用于无头模式）。
      // "--no-zygote", // 禁用 Zygote 进程模型，启动时不创建一个共享的子进程来提高性能。
    ],
    executablePath: chromePath, // 使用检测到的 Chrome 路径
    // userDataDir: './user_data',  // 或者临时目录：`/tmp/puppeteer_${Date.now()}`
    // defaultViewport: { width: 1920, height: 1024 },
  });

  for (const account of accounts) {
    try {
      let page = await browser.newPage();

      // await navigateToRegistrationPage(page);

      // const email = await getTempEmail();
      // logger.info(`使用临时邮箱注册: ${email}`);

      // await delay(1000);

      // await fillRegistrationForm(page, account, email);
      // await handleSlider(page);

      // await page.waitForSelector('input[name="memberAgreement"]');
      // await page.click('input[name="memberAgreement"]');
      // await delay(1000)
      // await page.click('button.RP-form-submit');

      // await handleVerification(page, email);

      // // 点击注册
      // await delay(1000)
      // await page.click('.RP-modal-item:nth-child(3) button.RP-modal-button');
      // logger.info(`账号 ${email} 注册成功！`);

      // // 等待登录完成
      // await page.waitForSelector('.tnh-loggedin .tnh-ma');
      // await delay(3000)
      // 跳转到 ug 进行用户设置
      await page.goto('https://ug.alibaba.com/?wx_navbar_transparent=true', { waitUntil: ['domcontentloaded', 'networkidle0'] });
      // logger.info(`账号 ${email} 进行登录！`);
      const email = 'nvn7oue4b4@rteet.com'
      // 登录操作
      await delay(1000)
      await page.waitForSelector("input[name='account']")
      await page.waitForSelector("input[name='password']")
      await page.type("input[name='account']", email, { delay: 100 })
      await page.type("input[name='password']", account.password, { delay: 100 })
      await delay(1000)
      await page.click("button.sif_form-submit")
      await delay(3000)

      // 等待滑块展示
      // 等待并获取 iframe 的句柄
      await page.waitForSelector("iframe#baxia-dialog-content")
      const iframeElementHandle = await page.$('iframe#baxia-dialog-content');
      console.log('iframeElementHandle', iframeElementHandle)
      await iframeElementHandle.waitForSelector('#nocaptcha');


      // 获取 iframe 的 contentFrame（即 iframe 的文档上下文）
      const iframe = iframeElementHandle.contentFrame();
      console.log('iframe', iframe)

      const textInIframe = await iframe.evaluate(() => {
        return document.querySelector('.nc-lang-cnt').textContent;
      });

      console.log('textInIframe', textInIframe)

      const iframeContent = await iframeElementHandle.contentFrame().evaluate(() => {
        return document.body.innerHTML;
      });
      console.log('iframeContent', iframeContent)

      // 等待滑块组件加载完成，可以通过检查滑块是否可见
      await iframe.waitForSelector('#nocaptcha .nc-lang-cnt', { visible: true });

      // 执行滑块拖动操作（假设滑块元素是可见且可拖动的）
      const sliderHandle = await iframe.$('.nc_scale .btn_slide');
      console.log('sliderHandle', sliderHandle)
      const box = await sliderHandle.boundingBox();
      console.log('box', box)
      // 计算拖动的目标位置（例如目标是滑块右侧的某个位置）
      const targetX = box.x + box.width;
      const targetY = box.y + box.height / 2;
      // 拖动滑块
      await iframe.mouse.move(box.x, box.y);
      await iframe.mouse.down();
      await iframe.mouse.move(targetX, targetY, { steps: getRandomNumber(20, 30) });
      await delay(getRandomNumber(300, 600))
      await iframe.mouse.up();
      await delay(2000)

      // 登录完成
      // 点击 Unlock your stage
      await page.waitForSelector('.mb-header-wrapper .mb-header-button');
      await page.click('.mb-header-wrapper .mb-header-button');

      // 还有个 iframe
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
