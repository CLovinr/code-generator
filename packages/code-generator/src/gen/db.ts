import * as vscode from "vscode";

// https://github.com/sequelize/sequelize
// import { Sequelize } from "@sequelize/core";
// import { MariaDbDialect } from "@sequelize/mariadb";
// import { MsSqlDialect } from "@sequelize/mssql";
// import { MySqlDialect } from "@sequelize/mysql";
// import { PostgresDialect } from "@sequelize/postgres";
// import { SqliteDialect } from "@sequelize/sqlite3";
// import { Db2Dialect } from "@sequelize/db2";
import { Sequelize, Config, Options } from "sequelize";

import mysql2 from "mysql2";
import pg from "pg";
import mariadb from "mariadb";
import tedious from "tedious"; // mssql

Sequelize.beforeInit((config: Config, options: Options) => {
  // 解决打包后，运行期间找不到依赖的问题
  if (options.dialect === "mysql") {
    options.dialectModule = mysql2;
  } else if (options.dialect === "postgres") {
    options.dialectModule = pg;
  } else if (options.dialect === "mariadb") {
    options.dialectModule = mariadb;
  } else if (options.dialect === "mssql") {
    options.dialectModule = tedious;
  }

  if (!options.dialectModule) {
    console.warn(`load dialect module failed: ${options.dialect}`);
  }
});

async function newSequelize(item: any) {
  if (
    !["mysql", "postgres", "mariadb", "mssql"].includes(item.type as string)
  ) {
    const errmsg = `unknown type: ${item.type}`;
    vscode.window.showErrorMessage(errmsg);
    throw new Error(errmsg);
  }

  try {
    const sequelize = new Sequelize({
      ...item.options,
      dialect: item.type, //'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'db2' | 'snowflake' | 'oracle';
      config: {},
    });

    await sequelize.authenticate();

    if (item.initSqls) {
      for (const sql of item.initSqls) {
        await sequelize.query(sql);
      }
    }

    return sequelize;
  } catch (e) {
    vscode.window.showErrorMessage(`连接数据库失败：${e}`);
    throw e;
  }
}

export async function listTableInfo(
  context: vscode.ExtensionContext,
  item: any,
  tableName: string
) {
  const sequelize = await newSequelize(item);
  const describe = await sequelize.getQueryInterface().describeTable(tableName);
  const comment = await getTableComment(item.type, sequelize, tableName);
  sequelize.close();

  const columns = [];
  for (const name in describe) {
    columns.push({
      ...describe[name],
      name,
    });
  }

  return {
    name: tableName,
    comment,
    columns,
  };
}

export async function loadTables(context: vscode.ExtensionContext, item: any) {
  const sequelize = await newSequelize(item);

  const tables: any[] = [];
  const result = await sequelize.getQueryInterface().showAllTables();
  for (const name of result) {
    // const describe = await sequelize.getQueryInterface().describeTable(name);
    const comment = await getTableComment(item.type, sequelize, name);
    tables.push({
      name,
      comment,
      // columns: describe,
    });
  }

  sequelize.close();

  return tables;
}

async function getTableComment(
  type: string,
  sequelize: Sequelize,
  tableName: string
) {
  switch (type) {
    case "mysql":
    case "mariadb":
      return await getMySQLTableComment(sequelize, tableName);
    case "postgres":
      return await getPostgreSQLTableComment(sequelize, tableName);
    case "mssql":
      return await getMSSQLTableComment(sequelize, tableName);
    default:
      throw new Error("Unsupported database type");
  }
}

async function getMySQLTableComment(sequelize: Sequelize, tableName: string) {
  const rs: any = await sequelize.query(
    `SHOW TABLE STATUS LIKE '${tableName}';`
  );
  return rs[0]?.[0]?.Comment;
}

async function getPostgreSQLTableComment(
  sequelize: Sequelize,
  tableName: string
) {
  const rs: any = await sequelize.query(`
        SELECT obj_description(('"public."' || '${tableName}')::regclass) AS comment;
    `);
  return rs[0]?.[0]?.comment;
}

async function getMSSQLTableComment(sequelize: Sequelize, tableName: string) {
  const rs: any = await sequelize.query(`
        SELECT ep.value AS comment
        FROM sys.tables AS t
        LEFT JOIN sys.extended_properties AS ep
        ON ep.major_id = t.object_id
        WHERE t.name = '${tableName}' AND ep.name = 'MS_Description';
    `);
  return rs[0]?.[0]?.comment;
}
