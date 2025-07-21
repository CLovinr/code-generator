# Change Log

All notable changes to the "code-generator" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 发布说明

### 1.0.5

- 修复参数为空的问题

### 1.0.4

- 全选操作对自定义添加项有效。
- 固定数据表表头。
- 添加自定义数据项后，滚动到对应位置。
- 支持定位当前勾选项，定位下一个勾选项。
- 参数配置表单加入`重置参数`功能。
- 参数配置表单复选框支持`全选`操作。

### 1.0.3

- 显示代码生成输出文件数量信息。
- 打包发布时，自动将`README.md`文件中的图片链接改为`https://cdn.jsdelivr.net/gh/`前缀，以便中国大陆可以正常访问。
- 完善全局设置板块，`${expression}`支持表达式，如：`out = "${formState.var1 && formState.var2}"`。
- 添加的模块可上下移动排序。
- 删除添加的模块时，弹出确认框。
- 搜索可过滤添加的模块，且搜索忽略大小写。
- 可折叠日志板块。
- 发布版去掉 source map 文件。
- 实时保存部分配置信息到文件。

### 1.0.2

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
