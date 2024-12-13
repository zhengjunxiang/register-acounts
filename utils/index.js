// 获取解码平台手机号
const axios = require('axios');

// https://sms-activate.guru/en/api2
exports.default = {
  delay: (time) => new Promise(resolve => setTimeout(resolve, time)),
  async selectDropdownOptionByIndex(page, triggerSelector, optionIndex) {
    // 点击下拉框触发器
    await page.click(triggerSelector);
    await delay(1000); // 等待下拉框内容显示

    // 等待下拉选项的容器加载
    const dropdownSelector = '.ant-select-dropdown';
    await page.waitForSelector(dropdownSelector);
    await delay(300)

    // 查找并点击指定索引的选项
    await page.evaluate((index, dropdownSelector) => {
      const dropdowns = document.querySelectorAll(dropdownSelector);
      const latestDropdown = dropdowns[dropdowns.length - 1]; // 找到最新显示的下拉框
      const options = Array.from(latestDropdown.querySelectorAll('.ant-select-item'));
      if (options[index]) {
        options[index].click();
      } else {
        throw new Error(`Option with index ${index} not found`);
      }
    }, optionIndex, dropdownSelector);

    await delay(500); // 等待选项被选中
  },
  getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  generateUserAgent() {
    const browsers = ['Chrome', 'Firefox', 'Edge'];
    const os = ['Windows NT 10.0; Win64; x64', 'Macintosh; Intel Mac OS X 10_15_7', 'X11; Linux x86_64'];

    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const operatingSystem = os[Math.floor(Math.random() * os.length)];
    let browserVersion;

    if (browser === 'Chrome') {
      browserVersion = `${Math.floor(Math.random() * 10) + 114}.0.0.0`;
    } else if (browser === 'Firefox') {
      browserVersion = `${Math.floor(Math.random() * 10) + 90}.0`;
    } else if (browser === 'Edge') {
      browserVersion = `Edg/${Math.floor(Math.random() * 10) + 114}.0.0.0`;
    }

    return `Mozilla/5.0 (${operatingSystem}) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}/${browserVersion} Safari/537.36`;
  },
  // 获取电话号码
  async getPhoneNumber(apiKey, country, service) {
    const response = await axios.get(`https://sms-activate.org/stubs/handler_api.php`, {
      params: {
        api_key: apiKey,
        action: 'getNumber',
        service: service,
        country: country,
      },
    });

    const result = response.data.split(':');
    if (result[0] === 'ACCESS_NUMBER') {
      return {
        id: result[1],
        phone: result[2],
      };
    } else {
      throw new Error(`获取手机号失败: ${response.data}`);
    }
  },
  // 获取电话验证码
  async getSmsCode (apiKey, orderId) {
    const maxRetries = 20; // 最大尝试次数
    const delayTime = 5000; // 每次尝试间隔时间（毫秒）

    for (let i = 0; i < maxRetries; i++) {
      const response = await axios.get(`https://sms-activate.org/stubs/handler_api.php`, {
        params: {
          api_key: apiKey,
          action: 'getStatus',
          id: orderId,
        },
      });

      const result = response.data;
      console.log('result', result)
      if (result?.startsWith && result.startsWith('STATUS_OK')) {
        return result.split(':')[1]; // 返回验证码
      }

      // if (result.sms && result.sms.code) {
      //   return result.sms.code; // 返回验证码
      // }
      console.log('验证码未收到，等待中...');
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }

    throw new Error('获取验证码超时');
  },
  // 自动获取 Chrome 的路径
  async getChromePath() {
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
}