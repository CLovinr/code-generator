// v5.1.7：https://github.com/TryGhost/node-sqlite3

import path from "path";
import { Module } from "module";

import { getBasePath } from "../utils/config";

const originalRequire = Module.prototype.require;

Module.prototype.require = function (modulePath: string) {
  if (modulePath.endsWith("node_sqlite3.node")) {
    // const adjustedPath = path.join(
    //   getBasePath(),
    //   "resources",
    //   path.sep,
    //   "napi-nodes",
    //   `${process.platform}-${process.arch}`,
    //   "node_sqlite3.node"
    // );
    // return originalRequire.call(this, adjustedPath);
    return loadSqlite3Node();
  }
  return originalRequire.call(this, modulePath);
};

export function loadSqlite3Node() {
  const adjustedPath = path.join(
    getBasePath(),
    "resources",
    path.sep,
    "napi-nodes",
    `${process.platform}-${process.arch}`,
    "node_sqlite3.node"
  );
  return originalRequire(adjustedPath);
}

export async function loadSqlite3() {
  try {
    return await require("./sqlite3/lib/sqlite3.js");
  } catch (e) {
    console.error("load sqlite error: ", e);
  }
}
