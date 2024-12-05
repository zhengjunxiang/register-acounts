// 获取解码平台手机号
const axios = require('axios');

// https://sms-activate.guru/en/api2
exports.default = {
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
  }
}