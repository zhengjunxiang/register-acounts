// 获取解码平台手机号
const axios = require("axios");
const cheerio = require("cheerio");

// Mail.tm API 的基础 URL
const TM_BASE_URL = "https://api.mail.tm";

const getTMDomain = async function () {
  try {
    const response = await axios.get(`${TM_BASE_URL}/domains`);
    const domains = response.data["hydra:member"];
    if (domains.length > 0) {
      const randomIndex = Math.floor(Math.random() * domains.length);
      const domain = domains[randomIndex].domain;
      console.log("获取的域名:", domain);
      return domain;
    } else {
      throw new Error("未找到可用的域名。");
    }
  } catch (error) {
    console.error("获取域名失败:", error.response?.data || error.message);
    throw error;
  }
};
exports.default = {
  // 获取随机临时邮箱地址
  async get1secmailTempEmail() {
    const response = await axios.get(
      "https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1"
    );
    const email = response.data[0];
    return email;
  },
  // 检查邮箱的验证码
  async check1secmailEmail(email) {
    const maxRetries = 20; // 最大尝试次数
    const delayTime = 5000; // 每次尝试间隔时间（毫秒）

    for (let i = 0; i < maxRetries; i++) {
      const [login, domain] = email.split("@");
      const response = await axios.get(
        `https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`
      );
      const messages = response.data;
      if (messages.length > 0) {
        console.log("收到的邮件，进行验证码获取");
        // 获取邮件内容
        try {
          const mailDetails = await axios.get(
            `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${messages[0].id}`
          );
          // 加载 HTML 内容
          const $ = cheerio.load(mailDetails.data.body);

          // 查找验证码的 <span> 标签
          const verificationCode = $('span[style*="color: #ff6600"]').text();
          console.log("verificationCode: ", verificationCode);
          return verificationCode;
        } catch (e) {
          console.error("e", e);
        }
      }
      console.log("未收到邮件验证码，等待中...");
      await new Promise((resolve) => setTimeout(resolve, delayTime));
    }

    throw new Error("获取邮箱验证码超时");
  },

  // 获取可用域名
  getTMDomain,

  // 创建临时邮箱
  async createTMTempEmail() {
    try {
      // 获取有效域名
      const domain = await getTMDomain();
      // 生成随机密码
      const { nanoid } = await import("nanoid");
      const password = nanoid(12).toLocaleLowerCase();
      const email = `${password}@${domain}`;

      // 请求创建临时邮箱
      const response = await axios.post(`${TM_BASE_URL}/accounts`, {
        address: email, // 生成随机邮箱
        password: password,
      });

      const { id, address } = response.data;

      console.log("临时邮箱创建成功:", address);

      // 登录获取 Token
      const tokenResponse = await axios.post(`${TM_BASE_URL}/token`, {
        address: address,
        password: password,
      });

      const token = tokenResponse.data.token;

      return { id, email: address, token };
    } catch (error) {
      console.error("创建临时邮箱失败:", error.response?.data || error.message);
    }
  },

  // 检查邮箱中的邮件（带轮询逻辑）
  async checkTMInbox(token, retryCount = 10, interval = 5000) {
    try {
      for (let attempt = 0; attempt < retryCount; attempt++) {
        console.log(`第 ${attempt + 1} 次检查邮箱...`);

        const response = await axios.get(`${TM_BASE_URL}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const messages = response.data["hydra:member"];
        if (messages.length > 0) {

          // 获取第一封邮件的内容
          const messageId = messages[0].id;
          const mailResponse = await axios.get(
            `${TM_BASE_URL}/messages/${messageId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const verificationCode = mailResponse.data.text.match(/\d{6}/)?.[0]; // 假设验证码是6位数字
          if (verificationCode) {
            console.log("验证码:", verificationCode);
            return verificationCode;
          } else {
            console.log("邮件中未找到验证码。");
          }
        } else {
          console.log("当前邮箱未收到邮件。");
        }

        // 等待指定时间后重试
        if (attempt < retryCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      }

      console.log("超过最大重试次数，未收到邮件。");
      return null;
    } catch (error) {
      console.error("检查邮箱失败:", error.response?.data || error.message);
    }
  },
};
