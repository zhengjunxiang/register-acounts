const { app, BrowserWindow, ipcMain } = require('electron');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const os = require('os'); // 用于检测系统资源
const path = require('path');

const { launchConfig } = require('./constant/config').default
const logger = require('./utils/logger'); // 引入日志模块
const { getChromePath, delay } = require('./utils').default;
const { createTMTempEmail } = require('./utils/email').default;

const {
  navigateToRegistrationPage,
  fillRegistrationForm,
  handleRegistrationSlider,
  handleSubmit,
  handleVerificationAndRegister,
} = require('./modules/ailbaba/register').default;

const {
  navigateToLoginPage,
  checkInLoginPage,
  fillLoginForm,
  handleLoginSlider,
  handleUnlockStage,
} = require('./modules/ailbaba/login').default;

// 启用 stealth 插件
puppeteer.use(stealthPlugin());

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 960,
    webPreferences: {
      contextIsolation: true, // 启用上下文隔离（推荐开启）
      nodeIntegration: false, // 禁用 Node.js 集成
      preload: path.join(__dirname, 'preload.js'), // 可选：用于主进程和渲染进程的通信
    }
  });

  mainWindow.loadFile('index.html');

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// 启动任务
ipcMain.on('start-tasks', async (event, { maxConcurrency }) => {
  const { default: pLimit } = await import('p-limit');
  const chromePath = await getChromePath();

  if (!chromePath) {
    mainWindow.webContents.send('task-error', '未检测到系统中已安装的 Chrome');
    return logger.error(
      '未检测到系统中已安装的 Chrome。请前往 https://www.google.com/chrome 下载并安装后再试。'
    );
  }

   // 动态计算并发数
  const currentMaxConcurrency = Math.min(
    parseInt(maxConcurrency, 10),
    Math.max(2, Math.floor(os.cpus().length / 2))
  )

  const limit = pLimit(currentMaxConcurrency); // 设置并发数限制

  try {
    const accountsPath = path.join(__dirname, 'accounts.json'); // 获取文件的绝对路径
    const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));

    // 处理每个账号的注册和登录
    const tasks = accounts.map(async (account) => {
      return limit(async () => {
        try {
          const browser = await puppeteer.launch(launchConfig(chromePath));
          const pages = await browser.pages();
          const page = pages[0]

          await navigateToRegistrationPage(page);

          const { email, token } = await createTMTempEmail();

          await fillRegistrationForm(page, account, email);
          await handleRegistrationSlider(page);
          await handleSubmit(page);
          // 点击注册
          await handleVerificationAndRegister(page, token);

          // 等待登录完成
          await page.waitForSelector('.tnh-loggedin .tnh-ma');
          logger.info(`账号 ${email} 注册成功！`);
          await delay(3000);

          // 跳转到 ug 进行用户设置
          await navigateToLoginPage(page);

          const isInLoginPage = await checkInLoginPage(page)

          if (isInLoginPage) {
            // 填写登录表单
            await fillLoginForm(page, account, email);
            // 滑动登录滑块
            await handleLoginSlider(page);
          }

          // 登录完成 -> 点击 Unlock your stage
          await handleUnlockStage(page);

          await browser.close();

          mainWindow.webContents.send('task-log', `账号 ${email} 注册并登录成功`);
        } catch (err) {
          logger.error(`账号注册失败: ${err.message}`);
          mainWindow.webContents.send('task-error', `账号注册失败: ${err.message}`);
          throw new Error(`账号注册失败: ${err.message}`);
        }
      })
    });

    // 使用 Promise.allSettled，确保所有任务都完成
    const results = await Promise.allSettled(tasks);

    // 处理每个任务的结果
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const taskResult = result.value;
        if (taskResult && taskResult.error) {
          // 捕获任务本身的异常
          logger.error(`账号 ${accounts[index].firstName} 任务失败: ${taskResult.error.message}`);
        } else {
          // 成功任务
          logger.info(`账号 ${accounts[index].firstName} 注册和登录成功！`);
        }
      } else {
        logger.error(`账号 ${accounts[index].firstName} 未知异常: ${result.reason}`);
      }
    });
  } catch(e) {
    mainWindow.webContents.send('task-log', `信息 err: ${e}`);
  }

  logger.info('所有任务完成');
  mainWindow.webContents.send('task-complete', '所有任务完成');
});
