import * as vscode from "vscode";

// https://github.com/sequelize/sequelize
// import { Sequelize } from "@sequelize/core";
// import { MariaDbDialect } from "@sequelize/mariadb";
// import { MsSqlDialect } from "@sequelize/mssql";
// import { MySqlDialect } from "@sequelize/mysql";
// import { PostgresDialect } from "@sequelize/postgres";
// import { SqliteDialect } from "@sequelize/sqlite3";
// import { Db2Dialect } from "@sequelize/db2";
import { Sequelize, Config, Options, type ColumnDescription } from "sequelize";

import mysql2 from "mysql2";
import pg from "pg";
import mariadb from "mariadb";
import * as tedious from "tedious"; // mssql
import { loadSqlite3 } from "./sqlite3";

import path from "path";
import fs from "fs";

let sqlite3: any = undefined;

export async function initDrivers() {
  sqlite3 = await loadSqlite3();
}

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
    if (options.schema) {
      if (!options.dialectOptions) {
        options.dialectOptions = {};
      }

      const dialectOptions: any = options.dialectOptions;

      if (!dialectOptions.options) {
        dialectOptions.options = {};
      }

      dialectOptions.options.schema = options.schema;
    }
  } else if (options.dialect === "sqlite") {
    options.dialectModule = sqlite3;
    if (!options.dialectOptions) {
      options.dialectOptions = {};
    }

    const dialectOptions: any = options.dialectOptions;

    if (!dialectOptions.options) {
      dialectOptions.options = {};
    }

    dialectOptions.options.storage = options.storage;
  }

  if (!options.dialectModule) {
    console.warn(`load dialect module failed: ${options.dialect}`);
  }
});

async function newSequelize(configDir: string, item: any) {
  if (
    !["mysql", "postgres", "mariadb", "mssql", "sqlite"].includes(
      item.type as string
    )
  ) {
    const errmsg = `unknown type: ${item.type}`;
    vscode.window.showErrorMessage(errmsg);
    throw new Error(errmsg);
  }

  if (item.type === "sqlite") {
    const storage = path.resolve(configDir, item.options.storage);
    if (!fs.existsSync(storage)) {
      throw new Error(`sqlite db file not exists: ${item.options.storage}`);
    }
    item.options.storage = storage;
  }

  try {
    const sequelize = new Sequelize({
      ...item.options,
      dialect: item.type, //'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'db2' | 'snowflake' | 'oracle';
    });

    await sequelize.authenticate();

    if (item.initSqls) {
      for (const sql of item.initSqls) {
        await sequelize.query(sql);
      }
    }

    return sequelize;
  } catch (e: any) {
    vscode.window.showErrorMessage(
      `连接数据库失败：key=${item.key}, message=${e.message || e}`
    );
    throw e;
  }
}

export async function listTableInfo(
  context: vscode.ExtensionContext,
  configDir: string,
  item: any,
  tableName: string
): Promise<{
  name: string;
  comment?: string;
  columns: ColumnDescription[];
}> {
  const sequelize = await newSequelize(configDir, item);
  let describe;
  try {
    describe = await sequelize.getQueryInterface().describeTable(tableName);
  } catch (e: any) {
    vscode.window.showErrorMessage(
      `获取数据表结构信息失败： table=${tableName}, message=${e.message || e}`
    );
    throw e;
  }

  let comment;
  try {
    comment = await getTableComment(item.type, sequelize, tableName, item);
  } catch (e: any) {
    vscode.window.showErrorMessage(
      `获取数据表注释失败： table=${tableName}, message=${e.message || e}`
    );
    throw e;
  }
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

export async function loadTables(
  context: vscode.ExtensionContext,
  configDir: string,
  item: any
) {
  const sequelize = await newSequelize(configDir, item);

  const tables: any[] = [];
  let result;
  try {
    result = (await sequelize.getQueryInterface().showAllTables()) as any[];
  } catch (e: any) {
    vscode.window.showErrorMessage(
      `获取数据库数据表列表失败： message=${e.message || e}`
    );
    throw e;
  }

  for (let name of result) {
    if (item.type === "mssql" && typeof name === "object") {
      if (name.schema !== item.options.schema) {
        continue;
      } else {
        name = name.tableName;
      }
    }

    let comment;
    try {
      comment = await getTableComment(item.type, sequelize, name, item);
    } catch (e: any) {
      vscode.window.showErrorMessage(
        `获取数据表注释失败： table=${name}, message=${e.message || e}`
      );
      // throw e;
    }
    tables.push({
      name,
      comment,
    });
  }

  sequelize.close();

  return tables;
}

async function getTableComment(
  type: string,
  sequelize: Sequelize,
  tableName: string,
  item: any
) {
  switch (type) {
    case "mysql":
    case "mariadb":
      return await getMySQLTableComment(sequelize, tableName);
    case "postgres":
      return await getPostgreSQLTableComment(
        sequelize,
        tableName,
        item.options.schema
      );
    case "mssql":
      return await getMSSQLTableComment(
        sequelize,
        tableName,
        item.options.schema
      );
    case "sqlite":
      return undefined; // sqlite不支持表注释
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
  tableName: string,
  schema: string
) {
  const rs: any = await sequelize.query(`
        SELECT obj_description(('${schema}.${tableName}')::regclass) AS comment;
    `);
  return rs[0]?.[0]?.comment;
}

async function getMSSQLTableComment(
  sequelize: Sequelize,
  tableName: string,
  schema: string
) {
  const rs: any = await sequelize.query(`
        SELECT 
            obj.name AS table_name,
            ep.value AS table_comment
        FROM 
            sys.tables obj
        LEFT JOIN 
            sys.extended_properties ep 
            ON obj.object_id = ep.major_id 
            AND ep.minor_id = 0  -- 0 表示表级注释
        WHERE 
            obj.name = '${tableName}'          -- 表名
            AND SCHEMA_NAME(obj.schema_id) = '${schema}';  -- 模式名
    `);
  return rs[0]?.[0]?.table_comment;
}
