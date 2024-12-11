const { getRandomNumber, delay } = require('../../utils').default;
const logger = require('../../utils/logger'); // 引入日志模块

exports.default = {
  // 导航到 ug.alibaba 网站
  async navigateToLoginPage(page) {
    try {
      // 跳转到 ug 进行用户设置
      await page.goto('https://ug.alibaba.com/?wx_navbar_transparent=true', {
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 60000
      });
    } catch (err) {
      logger.error('导航到登录页面失败: ' + err.message);
      throw err;
    }
  },

  // 填写登录表单
  async fillLoginForm(page, account, email) {
    try {
      await delay(1000)
      await page.waitForSelector("input[name='account']")
      await page.waitForSelector("input[name='password']")
      await page.type("input[name='account']", email, { delay: 100 })
      await page.type("input[name='password']", account.password, { delay: 100 })
      await delay(1000)
      await page.click("button.sif_form-submit")
      await delay(3000)
    } catch (err) {
      logger.error('填写注册表单失败: ' + err.message);
      throw err;
    }
  },

  // 拖动滑块
  async handleLoginSlider(page) {
    try {
      const getSliderFrame = async (maxRetries = 10, delayMs = 600) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const frame = page.frames().find(frame => frame.url().includes('https://login.alibaba.com//newlogin/login.do'));
          if (frame) return frame;
          await delay(delayMs);
        }
        throw new Error('Failed to find slider iframe after maximum retries');
      };

      const generateBezierPath = (startX, startY, endX, endY, steps) => {
        const controlX1 = startX + (endX - startX) / 3 + getRandomNumber(-20, 20);
        const controlY1 = startY + getRandomNumber(-30, 30);
        const controlX2 = startX + 2 * (endX - startX) / 3 + getRandomNumber(-20, 20);
        const controlY2 = endY + getRandomNumber(-30, 30);
  
        const points = [];
        for (let t = 0; t <= 1; t += 1 / steps) {
          const x = Math.pow(1 - t, 3) * startX +
                    3 * Math.pow(1 - t, 2) * t * controlX1 +
                    3 * (1 - t) * Math.pow(t, 2) * controlX2 +
                    Math.pow(t, 3) * endX;
          const y = Math.pow(1 - t, 3) * startY +
                    3 * Math.pow(1 - t, 2) * t * controlY1 +
                    3 * (1 - t) * Math.pow(t, 2) * controlY2 +
                    Math.pow(t, 3) * endY;
          points.push({ x, y });
        }
        return points;
      };
  
      const runSlider = async () => {
        try {
          const navigationPromise = page.waitForNavigation({ timeout: 10000, waitUntil: 'domcontentloaded' }).catch(() => null);
          const selectorPromise = page.waitForSelector("iframe#baxia-dialog-content", { timeout: 10000 }).catch(() => null);
  
          const result = await Promise.race([navigationPromise, selectorPromise]);
          if (result === null || result === navigationPromise) {
            logger.info('Page navigation detected, skipping slider verification');
            return true;
          }
  
          const frame = await getSliderFrame();
  
          await frame.waitForSelector('.nc_scale .btn_slide', { timeout: 5000 });
  
          const sliderHandle = await frame.$('.nc_scale .btn_slide');
          const sliderContainer = await frame.$('.nc_scale');
  
          const sliderBox = await sliderHandle.boundingBox();
          const containerBox = await sliderContainer.boundingBox();
  
          if (!sliderBox || !containerBox) {
            throw new Error('Failed to retrieve bounding boxes for slider elements');
          }
  
          const startX = sliderBox.x + sliderBox.width / getRandomNumber(3, 4);
          const startY = sliderBox.y + sliderBox.height / getRandomNumber(3, 4);
          const endX = containerBox.x + containerBox.width - sliderBox.width / getRandomNumber(3, 4);
          const endY = startY;
  
          const path = generateBezierPath(startX, startY, endX, endY, getRandomNumber(30, 50));
  
          await page.mouse.move(path[0].x, path[0].y, { steps: 5 });
          await delay(getRandomNumber(300, 500));
          await page.mouse.down();
  
          for (const point of path) {
            await page.mouse.move(point.x, point.y, { steps: 1 });
            await delay(getRandomNumber(5, 20));
          }
  
          await page.mouse.up();
          await delay(getRandomNumber(500, 1000));
        } catch (error) {
          logger.error('Error during slider operation:', error);
          throw error;
        }
      };

      const checkSliderResult = async (maxRetries = 20, delayMs = 600) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const frame = await getSliderFrame();

          // Check for success or failure elements
          const errWrapper = await frame.$('.nc_wrapper .errloading');
          const okWrapper = await frame.$('.nc_wrapper .btn_ok');

          if (errWrapper) return 'fail';
          if (okWrapper) return 'success';

          await delay(delayMs);
        }
        return 'timeout';
      };

      for (let retryCount = 0; retryCount < 10; retryCount++) {
        try {
          const navigationDetected = await runSlider();
          if (navigationDetected) {
            logger.info('Page navigation detected, assuming login success');
            return true;
          }

          const result = await checkSliderResult();

          if (result === 'success') {
            logger.info('Slider verification succeeded');
            return true;
          } else if (result === 'fail') {
            logger.warn('Slider verification failed, retrying...');
            const frame = await getSliderFrame();
            await frame.click('.nc_wrapper .errloading');
          } else if (result === 'timeout') {
            throw new Error('Slider verification timed out');
          }
        } catch (error) {
          logger.error(`Retry ${retryCount + 1}:`, error);
          if (retryCount === 9) throw new Error('Slider verification failed after maximum retries');
        }
      }

    } catch (err) {
      logger.error('登录滑块验证失败: ' + err.message);
      throw err;
    }
  },

  // 选择操作
  async handleUnlockStage(page) {
    await page.waitForSelector('.mb-header-wrapper .mb-header-button');
    await page.click('.mb-header-wrapper .mb-header-button');

    // 等待并获取 iframe 展示
    await page.waitForSelector(".mb-dialog-content")
    await delay(3000)
    function getFrime() {
      return page.frames().find(frame => {
        return frame.url().includes('https://air.alibaba.com/app')
      });
    }
    let frame = getFrime()
    let count = 0
    while (!frame && count < 10) {
      count++
      await delay(600)
      frame = getFrime()
    }
    await delay(2000)
    // 等待滑块展示
    await frame.waitForSelector('#upgradeToDialog .business-identify-group .business-identify-type .type-item-chose')

    // 进行第一步选择
    await delay(2000)
    const businessTypeSelector = '.business-identify-group .business-identify-type .type-item-title'

    // 查找匹配文本为 "other" 的元素
    const targetElementHandle = await frame.evaluateHandle((selector, text) => {
      const elements = Array.from(document.querySelectorAll(selector));
      return elements.find((el) => el.textContent.trim() === text);
    }, businessTypeSelector, 'Other');

    const businessTypeBox = await targetElementHandle.boundingBox();

    const startX1 = businessTypeBox.x + businessTypeBox.width / 2;
    const startY1 = businessTypeBox.y + businessTypeBox.height / 2;
    await page.mouse.move(startX1, startY1, { steps: getRandomNumber(50, 100) });
    await page.mouse.down()
    await delay(300)
    await page.mouse.up()
    await delay(1000)
    await frame.click('#upgradeToDialog .layout-footer .footer-button');

    // 进行第二步选择
    await delay(2000)
    await frame.waitForSelector('input#street');
    await frame.type('input#street', 'New York', { delay: 100 });
    await delay(600)
    await frame.click('input#street');
    await delay(2000)
    await frame.waitForSelector('.next-overlay-wrapper .next-menu-item:first-child');
    await frame.click('.next-overlay-wrapper .next-menu-item:first-child');

    await delay(500)
    await frame.click('#upgradeToDialog .clause-box .fold-box .fold-box-checkbox');
    await delay(600)
    await frame.click('#upgradeToDialog .layout-footer .footer-button');
  },

}
