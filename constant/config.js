exports.default = {
  launchConfig: (chromePath) => ({
    headless: false,
    ignoreHTTPSErrors: true,
    args: [
      '--window-size=1440,1024',
      '--enable-automation', // 取消自动打开的空白页
      '--disable-features=IsolateOrigins,site-per-process',
      // IsolateOrigins：默认启用该功能时，Chromium 会将不同源的内容隔离到不同的进程中。这是为了增强安全性，但有时会影响页面加载或性能。
      // site-per-process：禁用每个站点每个进程的隔离，可能有助于性能优化。
      '--disable-blink-features=AutomationControlled', // 禁用自动化提示
      '--disable-infobars', // 隐藏“Chrome 正在受自动化软件控制”提示条。
      '--blink-settings=imagesEnabled=true',
      "--no-sandbox", // 使用沙盒模式
      "--disable-setuid-sandbox", // 禁用setuid沙盒（仅限Linux）
      "--disable-extensions", // 禁用扩展
      // "--incognito", // 启用无痕模式，减少浏览器状态干扰。
      '--no-first-run', // 避免首次运行时打开欢迎页面或空白页
      // "--disable-gpu", // 禁用 GPU 加速（主要用于无头模式）。
      "--no-zygote", // 禁用 Zygote 进程模型，启动时不创建一个共享的子进程来提高性能。
    ],
    executablePath: chromePath, // 使用检测到的 Chrome 路径
    // userDataDir: './user_data',  // 或者临时目录：`/tmp/puppeteer_${Date.now()}`
    // defaultViewport: { width: 1920, height: 1024 },
  })
}