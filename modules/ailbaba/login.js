const { getRandomNumber, delay } = require("../../utils").default;
const logger = require("../../utils/logger"); // 引入日志模块

exports.default = {
  // 导航到 ug.alibaba 网站
  async navigateToLoginPage(page) {
    try {
      // 跳转到 ug 进行用户设置
      await page.goto("https://ug.alibaba.com/?wx_navbar_transparent=true", {
        waitUntil: ["domcontentloaded", "networkidle0"],
        timeout: 120000,
      });
    } catch (err) {
      logger.error("导航到登录页面失败: " + err.message);
      throw err;
    }
  },

  // 填写登录表单
  async fillLoginForm(page, account, email) {
    try {
      await delay(1000);
      await page.waitForSelector("input[name='account']");
      await page.waitForSelector("input[name='password']");
      await page.type("input[name='account']", email, { delay: 100 });
      await page.type("input[name='password']", account.password, {
        delay: 100,
      });
      await delay(1000);
      await page.click("button.sif_form-submit");
      await delay(3000);
    } catch (err) {
      logger.error("填写注册表单失败: " + err.message);
      throw new Error(err.message);
    }
  },

  // 拖动滑块
  async handleLoginSlider(page) {
    try {
      // 获取滑块 iframe
      const getSliderFrame = async (maxRetries = 10, delayMs = 1000) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const frame = page
            .frames()
            .find((frame) =>
              frame
                .url()
                .includes("https://login.alibaba.com//newlogin/login.do")
            );
          if (frame) return frame;
          console.log(`Retrying to find slider iframe, attempt ${attempt + 1}`);
          await delay(delayMs);
        }
        throw new Error("Failed to find slider iframe after maximum retries");
      };

      // 滑动验证
      const runSlider = async () => {
        const frame = await getSliderFrame();
        await delay(600)
        await frame.waitForSelector(".nc_scale .btn_slide");
        await delay(600)

        const sliderContainer = await frame.$(".nc_scale");
        const sliderHandle = await frame.$(".nc_scale .btn_slide");

        const silderContainerBox = await sliderContainer.boundingBox();
        const sliderHadnleBox = await sliderHandle.boundingBox();

        if (!sliderHadnleBox || !silderContainerBox) {
          throw new Error("Failed to retrieve bounding boxes for slider elements");
        }

        const startX = sliderHadnleBox.x + sliderHadnleBox.width / getRandomNumber(2,4);
        const startY = sliderHadnleBox.y + sliderHadnleBox.height / getRandomNumber(2,4);
        const endX = sliderHadnleBox.x + silderContainerBox.width + sliderHadnleBox.width * getRandomNumber(0,2);

        // 模拟拖动滑块
        await page.mouse.move(startX, startY);
        await delay(getRandomNumber(200, 300));
        await page.mouse.down();
        await delay(getRandomNumber(200, 300));
        await page.mouse.move(endX, startY, { steps: getRandomNumber(2,3) }); // 多步拖动模拟人为操作
        await delay(getRandomNumber(300, 600));
        await page.mouse.up();

        await delay(2000); // 等待验证结果加载
      };

      // 检查滑块验证结果
      const checkSliderResult = async (maxRetries = 20, delayMs = 500) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          await delay(delayMs);
          const frame = await getSliderFrame();

          // 检查验证状态
          const errWrapper = await frame.$(".nc_wrapper .errloading");
          const okWrapper = await frame.$(".nc_wrapper .btn_ok");

          if (errWrapper) {
            return "fail";
          }
          if (okWrapper) {
            return "success";
          }
        }
        return "timeout";
      };

      // 循环尝试滑块验证
      for (let retryCount = 0; retryCount < 10; retryCount++) {
        logger.info(
          `Starting slider verification attempt #${retryCount + 1}`
        );
        // 判断页面是否还在登录页
        let isHasAccountInp1 = await page.$("input[name='account']");
        if (!isHasAccountInp1) return true
        await runSlider();
        await delay(600)
        let isHasAccountInp2 = await page.$("input[name='account']");
        if (!isHasAccountInp2) return true
        const result = await checkSliderResult();
        if (result === "success") {
          return true;
        } else if (result === "fail") {
          const frame = await getSliderFrame();
          await frame.click(".nc_wrapper .errloading"); // 点击重新加载
          await delay(600)
        } else if (result === "timeout") {
          throw new Error("Slider verification timed out");
        }
        if (retryCount >= 9) {
          throw new Error("Slider verification failed after maximum retries");
        }
      }
    } catch (err) {
      logger.error("登录滑块验证失败: " + err.message);
      throw new Error("登录滑块验证失败: " + err.message);
    }
  },

  // 选择操作
  async handleUnlockStage(page) {
    await page.waitForSelector(".mb-header-wrapper .mb-header-button");
    await page.click(".mb-header-wrapper .mb-header-button");

    // 等待并获取 iframe 展示
    await page.waitForSelector(".mb-dialog-content");
    await delay(3000);
    function getFrime() {
      return page.frames().find((frame) => {
        return frame.url().includes("https://air.alibaba.com/app");
      });
    }
    let frame = getFrime();
    let count = 0;
    while (!frame && count < 10) {
      count++;
      await delay(600);
      frame = getFrime();
    }
    await delay(2000);
    // 等待滑块展示
    await frame.waitForSelector(
      "#upgradeToDialog .business-identify-group .business-identify-type .type-item-chose"
    );

    // 进行第一步选择
    await delay(2000);
    const businessTypeSelector =
      ".business-identify-group .business-identify-type .type-item-title";

    // 查找匹配文本为 "other" 的元素
    const targetElementHandle = await frame.evaluateHandle(
      (selector, text) => {
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.find((el) => el.textContent.trim() === text);
      },
      businessTypeSelector,
      "Other"
    );

    const businessTypeBox = await targetElementHandle.boundingBox();

    const startX1 = businessTypeBox.x + businessTypeBox.width / 2;
    const startY1 = businessTypeBox.y + businessTypeBox.height / 2;
    await page.mouse.move(startX1, startY1, {
      steps: getRandomNumber(50, 100),
    });
    await page.mouse.down();
    await delay(300);
    await page.mouse.up();
    await delay(1000);
    await frame.click("#upgradeToDialog .layout-footer .footer-button");

    // 进行第二步选择
    await delay(2000);
    await frame.waitForSelector("input#street");
    await frame.type("input#street", "New York", { delay: 100 });
    await delay(600);
    await frame.click("input#street");
    await delay(2000);
    await frame.waitForSelector(
      ".next-overlay-wrapper .next-menu-item:first-child"
    );
    await frame.click(".next-overlay-wrapper .next-menu-item:first-child");

    await delay(500);
    await frame.click(
      "#upgradeToDialog .clause-box .fold-box .fold-box-checkbox"
    );
    await delay(600);
    await frame.click("#upgradeToDialog .layout-footer .footer-button");
  },
};
