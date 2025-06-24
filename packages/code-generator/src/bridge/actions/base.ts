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

  onAction("getTemplateData", async (data) => {
    const configDir: string = data as string;
    const generator = new CodeGenerator(context, configDir);

    return await generator.getTemplateData();
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

  let currentGeneratingGen: CodeGenerator | undefined;

  onAction("startGenCode", async (data: any) => {
    if (currentGeneratingGen?.generating) {
      const msg = "代码生成器已在运行中！";
      vscode.window.showWarningMessage(msg);
      throw new Error(msg);
    }

    const result = await vscode.window.showInformationMessage(
      "是否开始执行代码生成器？",
      { modal: true },
      "确认"
    );

    if (result !== "确认") {
      throw new Error("已取消！");
    }

    const configDir: string = data.configDir;
    const tplName: string = data.tplName;
    const baseOutDir: string = data.baseOutDir?.replace(/\\/g, "/");
    const uiValues: any = data.uiValues;

    const customerItems: Array<{
      id: any;
      name: string;
      comment?: string;
    }> = data.customerItems;
    const tables: string[] = data.tables;

    const items: Array<{
      id: any;
      name: string;
      comment?: string;
      isTable: boolean;
    }> = [];

    for (const item of customerItems) {
      items.push({
        ...item,
        isTable: false,
      });
    }

    for (const tableName of tables) {
      items.push({
        id: `table:${tableName}`,
        name: tableName,
        isTable: true,
      });
    }

    const generator = new CodeGenerator(context, configDir);
    try {
      currentGeneratingGen = generator;
      const result = await generator.startGenCode(
        {
          tplName,
          baseOutDir,
          uiValues,
        },
        items
      );
      vscode.window.showInformationMessage(`代码生成器已执行结束！`);
      return result;
    } finally {
      currentGeneratingGen = undefined;
    }
  });

  onAction("stopGenCode", async () => {
    if (currentGeneratingGen?.generating) {
      const result = await vscode.window.showInformationMessage(
        "是否终止运行代码生成器？",
        { modal: true },
        "确认"
      );

      if (result === "确认") {
        await currentGeneratingGen.stopGenCode();
      }
    }
  });

  onAction("selectSaveDir", (data) => {
    const configDir = data as string;
    const generator = new CodeGenerator(context, configDir);

    return new Promise((resolve, reject) => {
      const options: vscode.OpenDialogOptions = {
        canSelectFolders: true, // 允许选择文件夹
        canSelectFiles: false, // 禁止选择文件
        canSelectMany: false, // 禁止多选
        openLabel: "选择文件夹", // 按钮文本
        title: "选择保存位置", // 对话框标题
        defaultUri: vscode.Uri.file(generator.getAbsBaseOutDir()),
      };

      vscode.window.showOpenDialog(options).then((uris) => {
        if (uris && uris.length > 0) {
          const folderPath = uris[0].fsPath.replace(/\\/g, "/");

          const relPath = path
            .relative(configDir, folderPath)
            .replace(/\\/g, "/");

          let finalPath = folderPath;

          if (relPath.startsWith(".")) {
            if (
              (relPath.startsWith("../") || relPath === "..") &&
              !relPath.startsWith("../../../")
            ) {
              finalPath = relPath.endsWith("..") ? relPath + "/" : relPath;
            } else {
              finalPath = folderPath;
            }
          } else if (relPath.startsWith("/") || relPath.indexOf(":") >= 0) {
            finalPath = folderPath;
          } else {
            finalPath = "./" + relPath;
          }

          generator.setCurrentJsonItem({
            baseOutDir: finalPath,
          });
          resolve(finalPath);
        } else {
          reject(new Error("用户取消了选择"));
        }
      });
    });
  });
}
