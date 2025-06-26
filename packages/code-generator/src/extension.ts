// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { registerSidebarWebView } from "./bridge/SidebarViewProvider";
import { registerJstplSemantic } from "./bridge/JstplSemanticTokensProvider";
import { registerJstplHighlight } from "./bridge/JstplHighlight";
import { registerJstplFileIconProvider } from "./bridge/JstplFileIconProvider";

import { setBasePath } from "./utils/config";
import { initDrivers } from "./gen/db";

export async function activate(context: vscode.ExtensionContext) {
  setBasePath(context.extensionPath);
  try {
    await initDrivers();
  } catch (e: any) {
    console.error("init drivers failed: ", e);
  }

  registerSidebarWebView(context);

  registerJstplSemantic(context);
  registerJstplHighlight(context);

  registerJstplFileIconProvider(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
