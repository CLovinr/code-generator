# code generator

Visual Studio Code 代码生成器插件

## 1、安装要求

- Visual Studio Code v1.90.0+

## 2、扩展设置

## 3、代码生成器说明

### 基础说明

1. 文件后缀为`.jstpl`或（`.jsin`，可导入文件），模板格式类似`jsp`，只是脚本语言为`js`。
2. `common/scripts`中的文件为全局可调用的 js 脚本
   1. 脚本文件名必须为合法的 js 变量名
   2. 脚本文件名不要与系统内置成员重名
   3. 全局对象为`global`，类似浏览器的`window`
   4. 使用`module.exports`导出内部成员
      ```js
      module.export = {
          ...
      }
      ```

### 模板说明

1. 全局设置板块
   ```js
   <%@
       //设置输出文件
       out="java/${basePackagePath}/dto/${subName}/${moduleName}DTO.java"
   %>
   ```
   1. `out`：设置文件输出路径字符串，支持`${varName}`格式的变量。
   2. `write`：设置是否输出文件，若最终值为`"no"`、`"false"`、`false`、`"0"`、`0`时，则不会输出文件
   3. `execute` 设置是否执行 js 脚本，若最终值为`"no"`、`"false"`、`false`、`"0"`、`0`时，则不会执行
   4. `include`：引入子模板（`*.jsin`），优先在所选模板目录的 `includes` 下查找，若未找到、则在 `common/includes` 目录下查找
   5. 忽略后面的第一个行
2. 局部脚本区域
   ```js
   <%
       let varName = "World"
   %>
   Hello <%=varName%>
   ```
   1. 在当前模板下声明的变量，仅在当前模板下有效
   2. 忽略后面的第一个行
3. 表达式输出
   ```js
   <%=expression%>
   ```
   1. 直接输出表达式结果
   2. 忽略后面的第一个行，在后面添加`!`可保留后续的第一个换行，如：`<%=currentDatetime!%>`
4. 特殊变量
   1. `out` 用于输出内容
      - `out.print(...)` 直接输出内容
      - `out.println(...)` 结尾带换行符输出内容
   2. `tableInfo`结构
      ```typescript
      {
        type: string;
        allowNull: boolean;
        defaultValue: string;
        primaryKey: boolean;
        autoIncrement: boolean;
        comment: string | null;
      }
      ```
5. 配置文件`main.json5`
   1. `databases`用于设置数据库连接信息
   2. `attrs`用于设置全局变量
   ```json5
   {
     attrs: {
       subName: "sub",
     },
   }
   ```

## 4、已知问题

## 发布说明

### 1.0.0

- 支持数据库：mysql、mariadb（待测试）、postgres（待测试）、mssql（待测试）
- 支持批量生成
- 以 js 为脚本语言
- 模板格式类似`jsp`
- 支持自定义脚本（`common/scripts/*`）
- 支持简单的输入组件(`ui`)（进行中）
- 可添加非数据库模块（暂不支持添加字段）
