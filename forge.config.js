const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    "productName": "批量注册工具",
    "compression": "maximum",
    "files": [
      "dist/**/*",
      "package.json",
      "assets/**/*",
      "public/**/*",
      "preload.js",
      "accounts.json",
      "index.html"
    ],
  },
  rebuildConfig: {},
  makers: [
    // Windows 安装包 (Squirrel)
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: '批量注册工具',
        // iconUrl: 'https://example.com/path-to-icon.ico', // 设置 Windows 安装包图标
        setupIcon: './assets/icon.ico',  // 设置安装包的图标
        authors: 'Lem', // 作者名称或公司
        description: '批量注册工具是一款高效的账号自动注册工具。' // 应用程序的描述
      },
    },
    // macOS 安装包
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: '批量注册工具',
        // icon: './assets/icon.icns', // 设置 macOS DMG 图标
        // background: './assets/dmg-background.png', // 可选的 DMG 背景图
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
