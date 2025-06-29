# Change Log

All notable changes to the "code-generator" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 发布说明

### 1.0.1

- 较全面测试数据库：mysql、mariadb、postgres、mssql、sqlite
  - `mysql`：5.7，8.0
  - `postgresql`：17
  - `mssql`：2012，2017，2019，2022
  - `sqlite`：v3
  - `mariadb`：11.8.2
- 修复模板文件存在`\r\n`导致换行出现问题的问题
- 执行代码生成时，返回结果为空导致报错的问题

### 1.0.0

- 支持数据库：mysql、mariadb（未测试）、postgres、mssql、sqlite
- 支持批量生成
- 以 js 为脚本语言
- 模板格式类似`jsp`
- 支持自定义脚本（`common/scripts/*`）
- 支持简单的输入组件(`ui`)
- 可添加非数据库模块（暂不支持添加字段）
