const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals'); // 用于排除 node_modules

module.exports = {
  mode: 'production',
  entry: './main.js', // 主入口文件
  output: {
    filename: 'main.js', // 输出的文件名
    path: path.resolve(__dirname, 'dist'), // 输出的目录
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  // 用于排除外部依赖（避免打包 node_modules）
  externals: [nodeExternals()],
  resolve: {
    alias: {
      puppeteer: require.resolve('puppeteer-core'), // 使用 puppeteer-core
    },
    // 添加支持 .js 和 .json 文件
    extensions: ['.js', '.json'],
  },
  // module: {
  //   rules: [
  //     {
  //       test: /\.js$/,  // 处理 JavaScript 文件
  //       exclude: /node_modules/,  // 排除 node_modules
  //       use: 'babel-loader',  // 使用 babel 进行转译
  //     },
  //   ],
  // },
  target: 'electron-main', // 指定目标为 Electron 主进程
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()], // 使用 Terser 压缩
  },
};
