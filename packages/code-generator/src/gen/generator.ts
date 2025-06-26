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
  private _generating: boolean;

  public constructor(context: vscode.ExtensionContext, configDir: string) {
    this.context = context;
    this.configDir = configDir;
    this._generating = false;
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

    config = _.merge(config, this.getCurrentJsonConfig());

    this.config = config;
  }

  private getCurrentDBItem() {
    const currentKey = this.config.databases.current;
    const dbConfigItem = this.config.databases.items?.[currentKey];

    if (!dbConfigItem || dbConfigItem.enable === false) {
      // vscode.window.showErrorMessage(`无法获取数据库连接配置：${currentKey}`);
      // throw new Error(`Not found database config item: ${currentKey}`);
      return null;
    }

    const item = _.cloneDeep(dbConfigItem);
    item.key = currentKey;

    return item;
  }

  private get currentJsonFile() {
    const currentPath = path.join(this.configDir, "local.current.json");
    return currentPath;
  }

  public getCurrentJsonConfig(encoding: BufferEncoding = "utf-8") {
    let currentJson = {};
    try {
      const currentJsonPath = this.currentJsonFile;
      if (fs.existsSync(currentJsonPath)) {
        const content = fs.readFileSync(currentJsonPath, encoding);
        const jsonConfig = JSON.parse(content);
        currentJson = jsonConfig || {};
      }
    } catch (e) {
      console.error("load current json error: ", e);
    }

    return currentJson;
  }

  public setCurrentJsonItem(
    subConfig: any,
    encoding: BufferEncoding = "utf-8",
    overwrite: boolean = false
  ) {
    let jsonConfig: any = this.getCurrentJsonConfig();
    if (!overwrite) {
      jsonConfig = _.merge(jsonConfig, subConfig);
    } else {
      for (const key in subConfig) {
        jsonConfig[key] = subConfig[key];
      }
    }
    this.saveCurrentJsonConfig(jsonConfig, encoding);
  }

  public saveCurrentJsonConfig(
    currentJson: any,
    encoding: BufferEncoding = "utf-8"
  ) {
    try {
      const content = JSON.stringify(currentJson || {}, undefined, 2);
      const currentJsonPath = this.currentJsonFile;
      fs.writeFileSync(currentJsonPath, content, {
        encoding: encoding,
      });
    } catch (e) {
      console.error("save current json error: ", e);
    }
  }

  public async getTemplateData() {
    const templatesDir = path.join(this.configDir, "templates");
    const files = fs.readdirSync(templatesDir);
    const templates: any[] = [];
    files.forEach((name) => {
      const stat = fs.statSync(path.join(templatesDir, name));
      if (stat.isDirectory()) {
        const tpl: any = {
          name,
        };
        const infoPath = path.join(path.join(templatesDir, name, "info.json5"));
        if (fs.existsSync(infoPath)) {
          try {
            const content = fs.readFileSync(infoPath, "utf-8");
            const tplInfo = JSON5.parse(content);
            tpl.description = tplInfo.description;
          } catch (err) {
            console.error(`load template info error: ${infoPath}`, err);
          }
        }

        templates.push(tpl);
      }
    });

    const labelWidth = this.config.ui?.labelWidth || 6;
    const uiParams = this.config.ui?.params || [];
    const uiValues = this.config.ui.values || {};
    const customerItems = this.config.customerItems || [];

    const dbItem = this.getCurrentDBItem();

    return {
      templates,
      current: this.config.tplName,
      baseOutDir: this.config.baseOutDir,
      uiProps: {
        labelWidth,
      },
      uiParams,
      uiValues,
      customerItems,
      info: {
        dbType: dbItem?.type,
      },
    };
  }

  public async loadTables() {
    const item = this.getCurrentDBItem();
    if (!item) {
      return {
        tables: null,
      };
    }
    const tables = await loadTables(this.context, item);
    return {
      tables,
    };
  }

  public async listTableInfo(tableName: string) {
    const item = this.getCurrentDBItem();
    return await listTableInfo(this.context, item, tableName);
  }

  public get generating() {
    return this._generating;
  }

  public async stopGenCode() {
    this._generating = false;
  }

  public getAbsBaseOutDir() {
    const baseOutDir = this.config.baseOutDir || "../target/genCODE";
    const absBaseOutDir = TplScript.getPath(this.configDir, baseOutDir);
    return absBaseOutDir;
  }

  public async startGenCode(
    options: {
      tplName?: string;
      baseOutDir?: string;
      uiValues?: any;
      customerItems?: any;
    },
    items: Array<{
      id: any;
      name: string;
      comment?: string;
      isTable: boolean;
    }>
  ) {
    try {
      this._generating = true;
      await this.doStartGenCode(options, items);
    } finally {
      this._generating = false;
    }
  }

  private async doStartGenCode(
    options: {
      tplName?: string;
      baseOutDir?: string;
      uiValues?: any;
      customerItems?: any;
    },
    items: Array<{
      id: any;
      name: string;
      comment?: string;
      isTable: boolean;
    }>
  ) {
    const config = _.cloneDeep(this.config);

    const baseOutDir =
      options.baseOutDir || config.baseOutDir || "../target/genCODE";

    const absBaseOutDir = TplScript.getPath(this.configDir, baseOutDir);

    const finalTplName = options.tplName || config.tplName;
    const uiValuesVar = this.config.ui?.attr || "formState";
    const finalUiValues = options.uiValues || {};

    const encoding = config.encoding || "utf-8";
    const outEncoding = config.outEncoding || encoding;

    const includeSuffix = config.includeSuffix || ".jsin";
    const tplSuffix = config.tplSuffix || ".jstpl";

    if (includeSuffix === tplSuffix) {
      throw new Error("unexpected: includeSuffix == tplSuffix");
    }

    const tplDir = path.join(this.configDir, "templates", finalTplName);
    const tplPaths = TplScript.listFileRecursive(tplDir).filter(
      (o) => path.extname(o) === tplSuffix
    );

    if (!tplPaths.length) {
      vscode.window.showWarningMessage("未找到模板文件");
      throw new Error("未找到模板文件");
    }

    const onStart = config.onStart?.trim();

    this.setCurrentJsonItem(
      {
        tplName: finalTplName,
        baseOutDir,
        ui: {
          values: finalUiValues,
        },
        customerItems: options.customerItems,
      },
      encoding,
      true
    );

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

    const globalContext = { ...config.attrs, [uiValuesVar]: finalUiValues };

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
        id: any;
        total: number;
        success: number;
        failed: number;
      }>,
    };

    for (const item of items) {
      const task = {
        id: item.id,
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
            if (!this._generating) {
              throw new Error("已终止");
            }

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

          if (!this._generating) {
            throw new Error("已终止");
          }
        }

        delete globalContext.require;
      }

      for (const item of items) {
        if (!this._generating) {
          throw new Error("已终止");
        }

        const task = state.tasks.filter((o) => o.id === item.id)[0];

        try {
          const tableInfo = item.isTable
            ? await this.listTableInfo(item.name)
            : {
                name: item.name,
                comment: item.comment,
                columns: [],
              };

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
            if (!this._generating) {
              throw new Error("已终止");
            }

            try {
              globalContext.console.log("process template:", file);
              noticeProgress();

              const result = TplScript.exeScript(
                absBaseOutDir,
                file,
                globalContext,
                includeSuffix,
                encoding,
                extraOptions
              );

              const outFile = result.out;
              const content = result.content;
              if (!outFile) {
                globalContext.console.log(
                  "no write file:",
                  outFile,
                  ", jstpl=" + file
                );
                noticeProgress();
              } else if (!result.write) {
                globalContext.console.log(
                  "not write file: ",
                  outFile,
                  ", jstpl=" + file
                );
                noticeProgress();
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
            `process item error: table or module=${item.name} `,
            e
          );
          task.failed = task.total;
          noticeProgress();
        } finally {
          if (task.total === task.success) {
            globalContext.console.success(`【成功】${item.name}`);
          } else {
            globalContext.console.warn(`【未成功】${item.name}`);
          }
        }

        await sleep(200);
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
