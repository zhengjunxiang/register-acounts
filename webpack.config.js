const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin'); // 引入插件

module.exports = {
  mode: 'production',
  entry: './main.js', // 主入口文件
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: {
    puppeteer: "require('puppeteer')",
    'puppeteer-extra': "require('puppeteer-extra')",
    'puppeteer-extra-plugin-stealth': "require('puppeteer-extra-plugin-stealth')"
  },
  resolve: {
    alias: {
      puppeteer: require.resolve('puppeteer-core'),
    },
    extensions: ['.js', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  target: 'electron-main',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  plugins: [
    // 使用 CopyWebpackPlugin 复制文件
    new CopyWebpackPlugin({
      patterns: [
        { from: 'preload.js', to: path.resolve(__dirname, 'dist') }, // 复制 preload.js
        { from: 'index.html', to: path.resolve(__dirname, 'dist') },  // 复制 index.html
        { from: 'accounts.json', to: path.resolve(__dirname, 'dist') }  // 复制 accounts.json
      ],
    }),
  ]
};
