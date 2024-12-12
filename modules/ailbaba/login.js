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
      throw err;
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
        console.log("Slider frame found, waiting for slider elements...");
        await delay(600)
        await frame.waitForSelector(".nc_scale .btn_slide");
        await delay(600)

        const sliderHandle = await frame.$(".nc_scale .btn_slide");
        const sliderContainer = await frame.$(".nc_scale");

        const sliderBox = await sliderHandle.boundingBox();
        const containerBox = await sliderContainer.boundingBox();

        if (!sliderBox || !containerBox) {
          throw new Error(
            "Failed to retrieve bounding boxes for slider elements"
          );
        }

        console.log("Slider elements located, starting drag operation...");
        const startX = sliderBox.x + sliderBox.width / 4;
        const startY = sliderBox.y + sliderBox.height / 3;
        const endX = containerBox.x + containerBox.width + sliderBox.width * 2;

        // 模拟拖动滑块
        await page.mouse.move(startX, startY);
        await delay(getRandomNumber(300, 600));
        await page.mouse.down();
        await delay(getRandomNumber(300, 600));
        await page.mouse.move(endX, startY, { steps: getRandomNumber(3, 5) }); // 多步拖动模拟人为操作
        await delay(getRandomNumber(300, 600));
        await page.mouse.up();

        console.log("Drag operation completed, waiting for result...");
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
            console.log("Slider failed, retrying...");
            return "fail";
          }
          if (okWrapper) {
            console.log("Slider succeeded!");
            return "success";
          }
        }
        return "timeout";
      };

      // 循环尝试滑块验证
      for (let retryCount = 0; retryCount < 10; retryCount++) {
        try {
          console.log(
            `Starting slider verification attempt #${retryCount + 1}`
          );
          await runSlider();
          await delay(600)
          const result = await checkSliderResult();
          if (result === "success") {
            console.log("Slider verification succeeded!");
            return true;
          } else if (result === "fail") {
            console.warn("Slider verification failed, retrying...");
            const frame = await getSliderFrame();
            await frame.click(".nc_wrapper .errloading"); // 点击重新加载
            await delay(600)
          } else if (result === "timeout") {
            console.error("Slider verification timed out");
            throw new Error("Slider verification timed out");
          }
        } catch (error) {
          console.error(`Attempt #${retryCount + 1} failed: ${error.message}`);
          if (retryCount === 9) {
            throw new Error("Slider verification failed after maximum retries");
          }
        }
      }
    } catch (err) {
      console.error("登录滑块验证失败: " + err.message);
      throw err;
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
