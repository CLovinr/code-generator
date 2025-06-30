// v5.1.7：https://github.com/TryGhost/node-sqlite3

import path from "path";
import { Module } from "module";
import { getBasePath } from "../utils/config";

const originalRequire = Module.prototype.require;

Module.prototype.require = function (modulePath: string) {
  const name = path.basename(modulePath);

  if (name.endsWith("node_sqlite3.node")) {
    return loadSqlite3Node();
  } else if (name.startsWith("oracledb-") && name.endsWith(".node")) {
    const dir = getDotNodeBaseDir();
    const adjustedPath = path.join(dir, name);
    return originalRequire(adjustedPath);
  }

  return originalRequire.call(this, modulePath);
};

// sqlite3-binding.js中使用
export function loadSqlite3Node() {
  const dir = getDotNodeBaseDir();
  const adjustedPath = path.join(dir, "node_sqlite3.node");
  return originalRequire(adjustedPath);
}

export function getDotNodeBaseDir() {
  const dir = path.join(
    getBasePath(),
    "resources",
    path.sep,
    "napi-nodes",
    `${process.platform}-${process.arch}`
  );

  return dir;
}

// v5.1.7：https://github.com/TryGhost/node-sqlite3
export async function loadSqlite3() {
  try {
    return await require("./sqlite3/lib/sqlite3.js");
  } catch (e) {
    console.error("load sqlite error: ", e);
  }
}
