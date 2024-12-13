const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');

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
  externals: [
    nodeExternals({
      allowlist: ['puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth'] // 保留这些库
    })
  ],
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
    new webpack.IgnorePlugin({
      resourceRegExp: /clone-deep/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^bufferutil$/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^utf-8-validate$/,
    }),
  ]
};
