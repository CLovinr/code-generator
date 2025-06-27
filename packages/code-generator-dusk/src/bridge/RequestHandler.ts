import * as vscode from "vscode";
import { registerActions } from "./actions/base";

export class RequestHandler {
  private static view: vscode.WebviewView | undefined;
  private static idCount = 0;
  private static actions: any = {};
  private static isRegisterActions = false;

  public static init(
    context: vscode.ExtensionContext,
    view: vscode.WebviewView
  ) {
    RequestHandler.view = view;
    if (!RequestHandler.isRegisterActions) {
      RequestHandler.isRegisterActions = true;
      registerActions(
        context,
        (type: string, callback: (data: any) => Promise<any> | any) => {
          RequestHandler.onAction(type, callback);
        }
      );
    }
  }

  public static dispose() {
    RequestHandler.view = undefined;
  }

  public static handleRequest(message: any) {
    if (message.type && message.type.startsWith("extension.")) {
      const type = (message.type as string).substring("extension.".length);
      const data = message.data;

      switch (type) {
        case "initReady":
          RequestHandler.onMessage(type, message, {
            type: "vscodeInitReady",
            data: "vscodeInitReady",
          });
          break;
        case "echo":
          RequestHandler.onMessage(type, message, {
            type: "echo",
            data: `已收到：${data}`,
          });
          break;
        case "listWorkspaceFolders":
          const folderNames = RequestHandler.getWorkspaceFolderNames();
          RequestHandler.onMessage(type, message, {
            type: "folders.list",
            data: {
              folders: folderNames,
            },
          });
          break;
        default:
          RequestHandler.onMessage(type, message);
      }
    }
  }

  private static async onMessage(
    type: string,
    message: any,
    response?: { type: string; data?: any }
  ) {
    const responseId = message.rid;
    if (response) {
      RequestHandler.sendMessage(response.type, response.data, {
        responseId,
        failed: false,
      });
    } else {
      if (responseId) {
        const actionHandle = RequestHandler.actions[type];
        if (!actionHandle) {
          RequestHandler.sendMessage(type, undefined, {
            responseId,
            failed: true,
            errmsg: "not found",
          });
        } else {
          try {
            const result = actionHandle.callback(message.data);
            let resultData;
            if (result instanceof Promise) {
              resultData = await result;
            } else {
              resultData = result;
            }
            RequestHandler.sendMessage(type, resultData, {
              responseId,
              failed: false,
            });
          } catch (e) {
            console.error(`on action error: type=${type} `, e);
            RequestHandler.sendMessage(type, undefined, {
              responseId,
              failed: true,
              errmsg: String(e),
            });
          }
        }
      }
    }
  }

  public static sendMessage(type: string, data?: any, options?: any) {
    try {
      // console.log(
      //   `send message from vscode: type=${type}, data=`,
      //   JSON.stringify(data)
      // );
      RequestHandler.view?.webview.postMessage({
        ...options,
        type: `extension.${type}`,
        data,
      });
    } catch (e) {
      console.error(`send message failed: type=${type} `, e);
    }
  }

  public static onAction(
    type: string,
    callback: (data: any) => Promise<any> | any
  ) {
    if (RequestHandler.actions[type]) {
      console.warn("already register action: type=", type);
    }

    RequestHandler.actions[type] = {
      callback,
      type,
    };
  }

  public static getWorkspaceFolderNames() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const folders: string[] = [];
    if (workspaceFolders) {
      for (const f of workspaceFolders) {
        folders.push(f.uri.fsPath.replace(/\\/g, "/"));
      }
    }

    return folders;
  }

  public static onDidChangeWorkspaceFolders() {
    const folderNames = RequestHandler.getWorkspaceFolderNames();

    RequestHandler.sendMessage("folders.change", {
      folders: folderNames,
    });
  }

  public static sendWorkspaceFolders() {
    const folderNames = RequestHandler.getWorkspaceFolderNames();
    RequestHandler.sendMessage("folders.list", {
      folders: folderNames,
    });
  }
}
