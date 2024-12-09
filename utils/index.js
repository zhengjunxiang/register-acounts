// 获取解码平台手机号
const axios = require('axios');
const cheerio = require('cheerio');

// https://sms-activate.guru/en/api2
exports.default = {
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
  // 获取随机临时邮箱地址
  async getTempEmail() {
    const response = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
    const email = response.data[0];
    console.log('临时邮箱:', email);
    return email;
  },

  // 检查邮箱的验证码
  async checkEmail(email) {
    const maxRetries = 20; // 最大尝试次数
    const delayTime = 5000; // 每次尝试间隔时间（毫秒）

    for (let i = 0; i < maxRetries; i++) {
      const [login, domain] = email.split('@');
      const response = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
      const messages = response.data;
      if (messages.length > 0) {
        console.log('收到的邮件，进行验证码获取');
        // 获取邮件内容
        try {
          const mailDetails = await axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${messages[0].id}`);
          // 加载 HTML 内容
          const $ = cheerio.load(mailDetails.data.body);

          // 查找验证码的 <span> 标签
          const verificationCode = $('span[style*="color: #ff6600"]').text();
          console.log('verificationCode: ', verificationCode)
          return verificationCode;
        } catch(e) {
          console.error('e', e)
        }
      }
      console.log('未收到邮件验证码，等待中...');
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }

    throw new Error('获取邮箱验证码超时');
  }
}