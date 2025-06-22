// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { SidebarViewProvider } from "./bridge/SidebarViewProvider";

export function activate(context: vscode.ExtensionContext) {
  const sidebarViewProvider = new SidebarViewProvider(
    context,
    context.extensionUri
  );

  const webviewProvider = vscode.window.registerWebviewViewProvider(
    SidebarViewProvider.viewType, // 页面 ID
    sidebarViewProvider, // 页面实例
    {
      webviewOptions: {
        retainContextWhenHidden: true, // 界面不可见时仍然保留内容
      },
    }
  );

  context.subscriptions.push(webviewProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
