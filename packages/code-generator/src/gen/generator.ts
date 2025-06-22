import * as vscode from "vscode";

import vm from "node:vm";
import fs from "fs";
import path from "path";
import JSON5 from "json5";
import _ from "lodash";

import { sleep } from "../utils/base";
import { loadTables, listTableInfo } from "./db";
import TplScript from "../core/TplScript";
import { RequestHandler } from "../bridge/RequestHandler";

export class CodeGenerator {
  private context: vscode.ExtensionContext;
  private configDir: string;
  private config: any;

  public constructor(context: vscode.ExtensionContext, configDir: string) {
    this.context = context;
    this.configDir = configDir;
    this.init();
  }

  private init() {
    const configPath = path.join(this.configDir, "main.json5");
    if (!fs.existsSync(configPath)) {
      RequestHandler.sendWorkspaceFolders();
      throw new Error(`main config file not exists: ${configPath}`);
    }

    const content = fs.readFileSync(configPath, "utf8");
    let config = JSON5.parse(content);

    if (config.local) {
      const localPath = path.resolve(this.configDir, config.local);
      delete config.local;
      if (fs.existsSync(localPath)) {
        const localContent = fs.readFileSync(localPath, "utf8");
        const localConfig = JSON5.parse(localContent);
        config = _.merge(config, localConfig);
      }
    }

    const currentPath = path.join(this.configDir, "local.current.json");
    if (fs.existsSync(currentPath)) {
      const localContent = fs.readFileSync(currentPath, "utf8");
      const localConfig = JSON5.parse(localContent);
      config = _.merge(config, localConfig);
    }

    this.config = config;
  }

  private getCurrentDBItem() {
    const currentName = this.config.databases.current;
    const dbConfigItem = this.config.databases.items.filter(
      (o: any) => o.name === currentName && o.enable !== false
    )[0];

    if (!dbConfigItem) {
      throw new Error(`Not found database config item: ${currentName}`);
    }

    const item = _.cloneDeep(dbConfigItem);
    return item;
  }

  public async loadTables() {
    const item = this.getCurrentDBItem();
    const tables = await loadTables(this.context, item);
    return tables;
  }

  public async listTableInfo(tableName: string) {
    const item = this.getCurrentDBItem();
    return await listTableInfo(this.context, item, tableName);
  }

  public async startGenCode(tableNames: string[]) {
    const result = await vscode.window.showInformationMessage(
      "是否开始执行代码生成器？",
      { modal: true },
      "确认"
    );

    if (result !== "确认") {
      throw new Error("已取消！");
    }

    const config = _.cloneDeep(this.config);
    const baseOutDir = TplScript.getPath(
      this.configDir,
      config.baseOutDir || "../target/genCODE"
    );

    const encoding = config.encoding || "utf-8";
    const outEncoding = config.outEncoding || encoding;

    const includeSuffix = config.includeSuffix || ".jsin";
    const tplSuffix = config.tplSuffix || ".jstpl";

    if (includeSuffix === tplSuffix) {
      throw new Error("unexpected: includeSuffix == tplSuffix");
    }

    const tplDir = path.join(this.configDir, "templates", config.tplName);
    const tplPaths = TplScript.listFileRecursive(tplDir).filter(
      (o) => path.extname(o) === tplSuffix
    );
    const onStart = config.onStart?.trim();

    const processLogData: any[] = [];
    let logId = 0;
    const pushLog = (type: string, args: any[]) => {
      const data: string[] = [];
      for (const s of args) {
        data.push(String(s));
        if (s instanceof Error && s.stack) {
          data.push("\n");
          data.push(s.stack);
        }
      }

      processLogData.push({
        id: `log-${logId++}`,
        type,
        message: data.join(" "),
      });
    };

    const extraOptions = {
      configDir: this.configDir,
      tplDir,
    };

    const globalContext = { ...config.attrs };

    globalContext.console = {
      ...console,
      log(...args: any[]) {
        pushLog("log", args);
      },
      debug(...args: any[]) {
        pushLog("debug", args);
      },
      info(...args: any[]) {
        pushLog("info", args);
      },
      warn(...args: any[]) {
        pushLog("warn", args);
      },
      error(...args: any[]) {
        pushLog("error", args);
      },
      success(...args: any[]) {
        pushLog("success", args);
      },
    };
    globalContext.global = globalContext;

    const state = {
      finish: false,
      tasks: [] as Array<{
        name: string;
        total: number;
        success: number;
        failed: number;
      }>,
    };

    for (const tableName of tableNames) {
      const task = {
        name: tableName,
        total: tplPaths.length,
        success: 0,
        failed: 0,
      };
      state.tasks.push(task);
    }

    const noticeProgress = () => {
      try {
        RequestHandler.sendMessage("generating.progress", {
          state,
          log: processLogData,
        });
      } catch (err) {
        console.error(err);
      }
    };

    noticeProgress();

    try {
      // 加载脚本
      {
        const scriptsDir = path.join(this.configDir, "common", "scripts");
        if (fs.existsSync(scriptsDir)) {
          const files = fs.readdirSync(scriptsDir);

          let scriptCodeQueue: string[] = ["const module={};"];
          files.forEach((name) => {
            const filePath = path.join(scriptsDir, name);
            if (filePath.endsWith(".js") && fs.statSync(filePath).isFile()) {
              const varName = name.substring(0, name.length - 3);
              const scriptContent = fs.readFileSync(filePath, encoding);
              scriptCodeQueue.push(`
              (function(){
                ${scriptContent}
              })();
              global.${varName} = module.exports;
                `);
            }
          });

          const options: vm.RunningScriptOptions = {
            timeout: 60 * 1000,
          };
          const ctx = vm.createContext(globalContext);
          const script = new vm.Script(scriptCodeQueue.join("\n"));
          script.runInContext(ctx, options);
        }

        delete globalContext.require;
      }

      for (const tableName of tableNames) {
        const task = state.tasks.filter((o) => o.name === tableName)[0];

        try {
          const tableInfo = await this.listTableInfo(tableName);

          globalContext.tableInfo = tableInfo;
          if (onStart) {
            const options: vm.RunningScriptOptions = {
              timeout: 60 * 1000,
            };
            const ctx = vm.createContext(globalContext);
            const script = new vm.Script(onStart);
            script.runInContext(ctx, options);
          }

          tplPaths.forEach((file) => {
            try {
              globalContext.console.log("process template:", file);
              noticeProgress();

              const result = TplScript.exeScript(
                baseOutDir,
                file,
                globalContext,
                includeSuffix,
                encoding,
                extraOptions
              );

              const outFile = result.out;
              const content = result.content;
              if (!result.write) {
                globalContext.console.log("not write file:", outFile);
              } else {
                globalContext.console.log("write file:", outFile);

                noticeProgress();

                if (!fs.existsSync(path.dirname(outFile))) {
                  fs.mkdirSync(path.dirname(outFile), { recursive: true });
                }

                fs.writeFileSync(outFile, content, {
                  encoding: outEncoding,
                });
              }

              task.success++;
              noticeProgress();
            } catch (e) {
              task.failed++;
              globalContext.console.error(
                `process template error: ${file} `,
                e
              );
              noticeProgress();
            }
          });
        } catch (e) {
          globalContext.console.error(
            `process item error: table=${tableName} `,
            e
          );
          task.failed = task.total;
          noticeProgress();
        } finally {
          if (task.total === task.success) {
            globalContext.console.success(`【成功】${tableName}`);
          } else {
            globalContext.console.warn(`【未成功】${tableName}`);
          }
        }

        await sleep(500);
      }
    } catch (e) {
      globalContext.console.error(e);
      console.error(e);
    } finally {
      state.finish = true;
    }

    noticeProgress();

    await sleep(500);

    return {
      state,
      log: processLogData,
    };
  }
}
