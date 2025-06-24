// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { registerSidebarWebView } from "./bridge/SidebarViewProvider";
import { registerJstplSemantic } from "./bridge/JstplSemanticTokensProvider";
import { registerJstplHighlight } from "./bridge/JstplHighlight";

export function activate(context: vscode.ExtensionContext) {
  registerSidebarWebView(context);

  registerJstplSemantic(context);
  registerJstplHighlight(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
