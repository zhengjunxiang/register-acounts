const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { launchConfig } = require('./constant/config').default
const logger = require('./utils/logger'); // 引入日志模块
const { getChromePath, delay } = require('./utils').default;
const { createTMTempEmail } = require('./utils/email').default;

const {
  navigateToRegistrationPage,
  fillRegistrationForm,
  handleRegistrationSlider,
  handleSubmit,
  handleVerificationAndRegister,
} = require('./modules/ailbaba/register').default;

const {
  navigateToLoginPage,
  fillLoginForm,
  handleLoginSlider,
  handleUnlockStage,
} = require('./modules/ailbaba/login').default;

const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));

// 启用 stealth 插件
puppeteer.use(stealthPlugin());

(async () => {
  const chromePath = await getChromePath();
  if (!chromePath) {
    return logger.error(
      '未检测到系统中已安装的 Chrome。请前往 https://www.google.com/chrome 下载并安装后再试。'
    );
  }

  // 使用 Promise.all 以实现并发操作
  const browser = await puppeteer.launch(launchConfig(chromePath));
  // 获取所有打开的页面
  const pages = await browser.pages();

  // 如果只有一个默认空白页面，则关闭它
  if (pages.length === 1 && pages[0].url() === 'about:blank') {
    await pages[0].close();
  }

  // 处理每个账号的注册和登录
  const tasks = accounts.map(async (account) => {
    try {
      const page = await browser.newPage();

      // await navigateToRegistrationPage(page);

      // const { email, token } = await createTMTempEmail();
      // logger.info(`使用临时邮箱注册: ${email}`);
      // logger.info(`token: ${token}`);

      // await fillRegistrationForm(page, account, email);
      // await handleRegistrationSlider(page);
      // await handleSubmit(page);
      // 点击注册
      // await handleVerificationAndRegister(page, token);

      // 等待登录完成
      // await page.waitForSelector('.tnh-loggedin .tnh-ma');
      // logger.info(`账号 ${email} 注册成功！`);
      // await delay(3000);

      // 跳转到 ug 进行用户设置
      await navigateToLoginPage(page);
      const email = 'n7xoheeyr5o3@freesourcecodes.com'
      // 填写登录表单
      await fillLoginForm(page, account, email);

      await handleLoginSlider(page);

      // 登录完成 -> 点击 Unlock your stage
      logger.info('开始执行 handleUnlockStage');
      await handleUnlockStage(page);
      logger.info('完成 handleUnlockStage');
    } catch (err) {
      logger.error(`账号注册失败: ${err.message}`);
    }
  });

  // 使用 Promise.allSettled，确保所有任务都完成
  const results = await Promise.allSettled(tasks);

  // 处理每个任务的结果
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      logger.info(`账号 ${accounts[index].firstName} 注册和登录成功！`);
    } else {
      logger.error(`账号 ${accounts[index].firstName} 任务失败: ${result.reason}`);
    }
  });

  logger.info('所有任务完成');
  // await browser.close();
})();
