import * as vscode from "vscode";
import fs from "fs";
import path from "path";

import { copyFiles } from "../../utils/FileUtils";
import { CodeGenerator } from "../../gen/generator";

const CONFIG_MAIN_FILE_NAME = "main.json5";

export function registerActions(
  context: vscode.ExtensionContext,
  onAction: (type: string, callback: (data: any) => Promise<any> | any) => void
) {
  onAction("showInformationMessage", (message: any) => {
    vscode.window.showInformationMessage(message as string);
  });

  onAction("showWarningMessage", (message: any) => {
    vscode.window.showWarningMessage(message as string);
  });

  onAction("showErrorMessage", (message: any) => {
    vscode.window.showErrorMessage(message as string);
  });

  onAction("isInitCodeGenConfig", async (data: any) => {
    const p = data as string;
    if (
      fs.existsSync(p) &&
      fs.existsSync(path.join(p, CONFIG_MAIN_FILE_NAME))
    ) {
      return true;
    } else {
      return false;
    }
  });

  onAction("initCodeGenConfig", async (data: any) => {
    const result = await vscode.window.showInformationMessage(
      "是否初始化代码生成器？",
      { modal: true },
      "确认"
    );

    if (result === "确认") {
      const dir = data as string;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: false });
      }

      const subName = dir.substring(
        dir.lastIndexOf("/", dir.lastIndexOf("/") - 1) + 1
      );

      const templatesDir = path.join(
        context.extensionPath,
        "resources/default"
      );
      copyFiles(templatesDir, dir, false);

      vscode.window.showInformationMessage(
        `代码生成器基础配置已初始化：${subName}`
      );
    } else {
      return false;
    }
  });

  onAction("loadDBTables", async (data: any) => {
    const configDir: string = data as string;
    const generator = new CodeGenerator(context, configDir);
    return await generator.loadTables();
  });

  onAction("startGenCode", async (data: any) => {
    const configDir: string = data.configDir;
    const tables: string[] = data.tables;
    const generator = new CodeGenerator(context, configDir);
    const result = await generator.startGenCode(tables);
    vscode.window.showInformationMessage(`代码生成器已执行结束！`);
    return result;
  });
}
