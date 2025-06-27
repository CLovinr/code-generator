/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

"use strict";

const path = require("path");

const watch = process.argv.includes("--watch");

/**@type {import('webpack').Configuration}*/
const config = {
  watch: watch,
  target: "node", // vscode插件运行在Node.js环境中 📖 -> https://webpack.js.org/configuration/node/
  entry: "./src/extension.ts", // 插件的入口文件 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // 打包好的文件储存在'dist'文件夹中 (请参考package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode", // vscode-module是热更新的临时目录，所以要排除掉。 在这里添加其他不应该被webpack打包的文件, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    // 支持读取TypeScript和JavaScript文件, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js"],
    fallback: {
      // 找不到而忽略的模块
      "pg-hstore": false,
      "pg-native": false
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
};
module.exports = config;
