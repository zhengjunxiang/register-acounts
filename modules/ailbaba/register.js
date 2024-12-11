const { checkEmail, getRandomNumber, delay } = require('../../utils').default;
const logger = require('../../utils/logger'); // 引入日志模块

exports.default = {
  // 导航到 alibaba 网站
  async navigateToRegistrationPage(page) {
    try {
      await page.goto('https://alibaba.com/', { waitUntil: ['domcontentloaded', 'networkidle2'] });
      await page.waitForSelector('.tnh-button.tnh-sign-up');
      await page.click('.tnh-button.tnh-sign-up');
    } catch (err) {
      logger.error('导航到注册页面失败: ' + err.message);
      throw err;
    }
  },

  // 填写注册表单
  async fillRegistrationForm(page, account, email) {
    try {
      await delay(1000);
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
  },

  // 拖动滑块
  async handleRegistionSlider(page) {
    try {
      async function run() {
        await page.waitForSelector('#xjoin_no_captcha .nc_wrapper .nc_scale .btn_slide');
        const sliderHandle = await page.$('#xjoin_no_captcha .nc_wrapper .nc_scale .btn_slide');
        const sliderContainer = await page.$('#xjoin_no_captcha .nc_wrapper');

        const sliderBox = await sliderHandle.boundingBox();
        const containerBox = await sliderContainer.boundingBox();

        const startX = sliderBox.x + sliderBox.width / 2;
        const startY = sliderBox.y + sliderBox.height / 2;
        const endX = containerBox.x + containerBox.width - sliderBox.width / 4;

        await page.mouse.move(startX, startY);
        await delay(getRandomNumber(300, 600));
        await page.mouse.down();
        await page.mouse.move(endX, startY, { steps: getRandomNumber(20, 30) });
        await delay(getRandomNumber(300, 600));
        await page.mouse.up();
        await delay(1000)

        // 每秒检查一次，最多检查 10 次
        let success = false;
        for (attempt = 0; attempt < 10; attempt++) {
          success = await page.evaluate(() => document.querySelector('.nc_wrapper .btn_ok'));
          if (success) return; // 成功后退出函数
          // 判断是否失败
          const errWrapper = await page.$('.nc_wrapper .errloading')
          console.log('errWrapper', errWrapper)
          if (errWrapper) {
            await page.click('.nc_wrapper .errloading')
            await delay(1000)
            await run()
            return
          }
          await delay(600); // 每秒检查一次
        }

        if (!success) {
          throw new Error('滑块验证未通过，超过 10 次检查限制');
        }
      }
      await run()

    } catch (err) {
      logger.error('注册滑块验证失败: ' + err.message);
      throw err;
    }
  },

  // 点击提交
  async handleSubmit(page) {
    await page.waitForSelector('input[name="memberAgreement"]');
    await page.click('input[name="memberAgreement"]');
    await delay(1000)
    await page.click('button.RP-form-submit');
  },

  // 输入邮箱验证码
  async handleVerificationAndRegister(page, email) {
    try {
      const verificationCode = await checkEmail(email);
      if (verificationCode) {
        await page.type('input[name="emailVerifyCode"]', verificationCode, { delay: 100 });
        await delay(600)
        await page.click('.RP-modal-item:nth-child(3) button.RP-modal-button');
      }
    } catch (err) {
      logger.error('处理验证码失败: ' + err.message);
      throw err;
    }
  }
}
