import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import { RequestHandler } from "./RequestHandler";

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "extension.sidebar";
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly extensionUri: vscode.Uri // 插件所在路径
  ) {
    const disposable = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      RequestHandler.onDidChangeWorkspaceFolders();
    });

    this.context.subscriptions.push(disposable);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true, // 允许脚本
      localResourceRoots: [this.extensionUri], // 允许加载本地资源的路径
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    RequestHandler.init(this.context, webviewView);

    webviewView.webview.onDidReceiveMessage(RequestHandler.handleRequest);
    webviewView.onDidDispose(() => {
      RequestHandler.dispose();
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // 打包的前端页面资源的路径
    const sidebarPath = vscode.Uri.joinPath(
      this.extensionUri,
      "/dist/webview-view"
    );

    // 前端页面的入口文件
    const indexPath = vscode.Uri.joinPath(sidebarPath, "/index.html");
    let indexHtml = fs.readFileSync(indexPath.fsPath, "utf-8");
    const matchLinks = /(href|src)="([^"]*)"/g;
    const toUri = (_: string, prefix: "href" | "src", link: string) => {
      if (link === "#") {
        return `${prefix}="${link}"`;
      }
      const _path = path.join(sidebarPath.fsPath, link);
      const uri = vscode.Uri.file(_path);
      return `${prefix}="${webview.asWebviewUri(uri)}"`;
    };
    // 将本地资源路径替换成 webview 可以加载的资源路径
    indexHtml = indexHtml.replace(matchLinks, toUri);
    return indexHtml;
  }
}

export function registerSidebarWebView(context: vscode.ExtensionContext) {
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
