const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { launchConfig } = require('./constant/config').default
const logger = require('./utils/logger'); // 引入日志模块
const { getChromePath, getTempEmail, delay } = require('./utils').default;
const {
  navigateToRegistrationPage,
  fillRegistrationForm,
  handleRegistionSlider,
  handleVerificationAndRegister,
  handleSubmit,
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

  const browser = await puppeteer.launch(launchConfig(chromePath));

  // 获取所有打开的页面
  const pages = await browser.pages();

  // 如果只有一个默认空白页面，则关闭它
  if (pages.length === 1 && pages[0].url() === 'about:blank') {
    await pages[0].close();
  }

  for (const account of accounts) {
    try {
      const page = await browser.newPage();

      // await navigateToRegistrationPage(page);

      // const email = await getTempEmail();
      // logger.info(`使用临时邮箱注册: ${email}`);

      // await fillRegistrationForm(page, account, email);
      // await handleRegistionSlider(page);

      // await handleSubmit(page)

      // // 点击注册
      // await handleVerificationAndRegister(page, email);

      // // 等待登录完成
      // await page.waitForSelector('.tnh-loggedin .tnh-ma');
      // logger.info(`账号 ${email} 注册成功！`);
      // await delay(3000)

      const email = 'f3bmfvm@dpptd.com'

      // 跳转到 ug 进行用户设置
      await navigateToLoginPage(page);

      // 填写登录表单
      await fillLoginForm(page, account, email)

      await handleLoginSlider(page)

      logger.info(`账号 ${email} 登录成功1！`);
      logger.info('handleUnlockStage1')

      // 登录完成 -> 点击 Unlock your stage
      await handleUnlockStage(page)
    } catch (err) {
      logger.error(`账号注册失败: ${err.message}`);
    } finally {
      // await page.close();
    }
  }

  // await browser.close();
  logger.info('所有任务完成');
})();
