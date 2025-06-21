import * as vscode from "vscode";

import vm from "node:vm";
import fs from "fs";
import path from "path";
import JSON5 from "json5";
import _ from "lodash";

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
    const config = _.cloneDeep(this.config);
    const baseOutDir = TplScript.getPath(
      this.configDir,
      config.baseOutDir || "../target/genCODE"
    );

    const encoding = config.encoding || "utf-8";
    const outEncoding = config.outEncoding || encoding;

    const includeSuffix = config.includeSuffix || ".include";
    const tplSuffix = config.tplSuffix || ".jstpl";

    if (includeSuffix === tplSuffix) {
      throw new Error("unexpected: includeSuffix == tplSuffix");
    }

    const tplDir = path.join(this.configDir, "templates", config.tplName);
    const tplPaths = TplScript.listFileRecursive(tplDir);
    const onStart = config.onStart?.trim();

    const processLogData: string[] = [];
    const extraOptions = {
      configDir: this.configDir,
      tplDir,
      log(...args: any[]) {
        const data: string[] = [];
        for (const s of args) {
          data.push(String(s));
          if (s instanceof Error && s.stack) {
            data.push("\n");
            data.push(s.stack);
          }
        }

        processLogData.push(data.join(" "));
      },
    };

    const globalContext = { ...config.attrs };

    globalContext.console = {
      ...console,
      log(...args: any[]) {
        extraOptions.log.apply(undefined, args);
      },
      debug(...args: any[]) {
        extraOptions.log.apply(undefined, args);
      },
      info(...args: any[]) {
        extraOptions.log.apply(undefined, args);
      },
      warn(...args: any[]) {
        extraOptions.log.apply(undefined, args);
      },
      error(...args: any[]) {
        extraOptions.log.apply(undefined, args);
      },
    };
    globalContext.global = globalContext;

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
          if (path.extname(file) === tplSuffix) {
            extraOptions.log("process template:", file);

            try {
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
                extraOptions.log("not write file:", outFile);
              } else {
                extraOptions.log("write file:", outFile);

                if (!fs.existsSync(path.dirname(outFile))) {
                  fs.mkdirSync(path.dirname(outFile), { recursive: true });
                }

                fs.writeFileSync(outFile, content, {
                  encoding: outEncoding,
                });
              }
            } catch (e) {
              extraOptions.log(`process template error: ${file} `, e);
              console.error(`process template error: ${file} `, e);
            }
          }
        });
      }
    } catch (e) {
      extraOptions.log(e);
    }

    return {
      log: processLogData.join("\n"),
    };
  }
}
