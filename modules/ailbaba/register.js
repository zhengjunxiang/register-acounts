const { getRandomNumber, delay } = require("../../utils").default;
const { checkTMInbox } = require("../../utils/email").default;
const logger = require("../../utils/logger"); // 引入日志模块

exports.default = {
  // 导航到 alibaba 网站
  async navigateToRegistrationPage(page) {
    try {
      await page.goto("https://alibaba.com/", {
        waitUntil: ["domcontentloaded", "networkidle2"],
        timeout: 120000
      });
      await page.waitForSelector(".tnh-button.tnh-sign-up", {timeout: 60000});
      await page.click(".tnh-button.tnh-sign-up");
    } catch (err) {
      logger.error("导航到注册页面失败: " + err.message);
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
      await page.type('div[name="countryCode"]', account.country, {
        delay: 100,
      });
      await page.click(
        ".rc-virtual-list .ant-select-item.ant-select-item-option:nth-child(1)"
      );
      // 选择 trade role
      await page.waitForSelector(".ant-radio-group .ant-radio-wrapper", {
        timeout: 6000,
      });
      await page.click(".ant-radio-group .ant-radio-wrapper:nth-child(1)");
      await page.waitForSelector('input[name="email"]');
      await page.type('input[name="email"]', email, { delay: 100 });
      await page.type('input[name="password"]', account.password, {
        delay: 100,
      });
      await page.type('input[name="confirmPassword"]', account.password, {
        delay: 100,
      });
      await page.type('input[name="companyName"]', account.company, {
        delay: 100,
      });
      await page.type('input[name="firstName"]', account.firstName, {
        delay: 100,
      });
      await page.type('input[name="lastName"]', account.lastName, {
        delay: 100,
      });
      await page.type('input[name="phoneAreaCode"]', account.phoneAreaCode, {
        delay: 100,
      });
      await page.type('input[name="phoneNumber"]', account.phoneNumber, {
        delay: 100,
      });
    } catch (err) {
      logger.error("填写注册表单失败: " + err.message);
      throw err;
    }
  },

  // 拖动滑块
  async handleRegistrationSlider(page) {
    try {
      const runSlider = async () => {
        try {
          await page.waitForSelector(
            "#xjoin_no_captcha .nc_wrapper .nc_scale .btn_slide",
            { timeout: 30000 }
          );
          const sliderHandle = await page.$(
            "#xjoin_no_captcha .nc_wrapper .nc_scale .btn_slide"
          );
          const sliderContainer = await page.$("#xjoin_no_captcha .nc_wrapper");

          const sliderBox = await sliderHandle.boundingBox();
          const containerBox = await sliderContainer.boundingBox();

          if (!sliderBox || !containerBox) {
            throw new Error(
              "Failed to retrieve bounding boxes for slider elements"
            );
          }

          const startX = sliderBox.x + sliderBox.width / 2;
          const startY = sliderBox.y + sliderBox.height / 2;
          const endX =
            containerBox.x + containerBox.width + sliderBox.width * getRandomNumber(1, 3);

          await page.mouse.move(startX, startY);
          await delay(getRandomNumber(300, 600));
          await page.mouse.down();
          await page.mouse.move(endX, startY, {
            steps: getRandomNumber(20, 30),
          });
          await delay(getRandomNumber(300, 600));
          await page.mouse.up();
          await delay(1000);
        } catch (error) {
          logger.error("Error during slider operation:", error);
          throw error;
        }
      };

      const checkSliderResult = async (maxRetries = 20, delayMs = 600) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const success = await page.evaluate(() =>
            document.querySelector(".nc_wrapper .btn_ok")
          );
          if (success) return "success";

          const errWrapper = await page.$(".nc_wrapper .errloading");
          if (errWrapper) return "fail";

          await delay(delayMs);
        }
        return "timeout";
      };

      for (let retryCount = 0; retryCount < 10; retryCount++) {
        try {
          await runSlider();

          const result = await checkSliderResult();

          if (result === "success") {
            logger.info("Slider verification succeeded");
            return true;
          } else if (result === "fail") {
            logger.warn("Slider verification failed, retrying...");
            await page.click(".nc_wrapper .errloading");
            await delay(1000);
          } else if (result === "timeout") {
            throw new Error("Slider verification timed out");
          }
        } catch (error) {
          // logger.error(`Retry ${retryCount + 1}:`, error);
          if (retryCount === 9)
            throw new Error("Slider verification failed after maximum retries");
        }
      }
    } catch (err) {
      logger.error("Registration slider verification failed: " + err.message);
      throw err;
    }
  },

  // 点击提交
  async handleSubmit(page) {
    await page.waitForSelector('input[name="memberAgreement"]');
    await page.click('input[name="memberAgreement"]');
    await delay(1000);
    await page.click("button.RP-form-submit");
  },

  // 输入邮箱验证码
  async handleVerificationAndRegister(page, email) {
    try {
      const verificationCode = await checkTMInbox(email);
      if (verificationCode) {
        await page.type('input[name="emailVerifyCode"]', verificationCode, {
          delay: 100,
        });
        await delay(600);
        await page.click(".RP-modal-item:nth-child(3) button.RP-modal-button");
      }
    } catch (err) {
      logger.error("处理验证码失败: " + err.message);
      throw err;
    }
  },
};
