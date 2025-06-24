import * as vscode from "vscode";

export function registerJstplHighlight(context: vscode.ExtensionContext) {
  forTags(context);
  forContents(context);
}

function forContents(context: vscode.ExtensionContext) {
  // 创建装饰
  const defaultTextDecoration = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("jstpl.defaultTextColor"),
  });

  // 注册配置项
  vscode.workspace
    .getConfiguration()
    .update("jstpl.defaultTextColor", "#bbbbbb", true);

  // 监听编辑器变化
  let activeEditor = vscode.window.activeTextEditor;

  function updateDecorations() {
    if (!activeEditor || activeEditor.document.languageId !== "jstpl") {
      return;
    }

    const text = activeEditor.document.getText();
    const ranges: vscode.DecorationOptions[] = [];

    // 所有非标签区域的正则表达式
    const nonTagRegex =
      /<%[^%]*%>|<%=[^%]*%>|<%@[^%]*%>|<%![^%]*%>|([^<]+|<(?!%))/g;
    let match;

    while ((match = nonTagRegex.exec(text))) {
      if (match[1]) {
        // 匹配到非标签内容
        const startPos = activeEditor.document.positionAt(match.index);
        const endPos = activeEditor.document.positionAt(
          match.index + match[0].length
        );
        ranges.push({ range: new vscode.Range(startPos, endPos) });
      }
    }

    activeEditor.setDecorations(defaultTextDecoration, ranges);
  }

  // 初始更新
  if (activeEditor) {
    updateDecorations();
  }

  // 监听编辑器变化
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  // 监听文本变化
  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  // 监听配置变化
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("jstpl.defaultTextColor")) {
      updateDecorations();
    }
  });
}

function forTags(context: vscode.ExtensionContext) {
  // 创建标签装饰
  const tagDecoration = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("jstpl.defaultTagColor"),
    fontWeight: "bold",
    fontStyle: "italic",
  });

  // 注册配置项
  vscode.workspace
    .getConfiguration()
    .update("jstpl.defaultTagColor", "#4d4d86", true);

  // 监听编辑器变化
  let activeEditor = vscode.window.activeTextEditor;

  function updateDecorations() {
    if (!activeEditor || activeEditor.document.languageId !== "jstpl") {
      return;
    }

    const text = activeEditor.document.getText();
    const ranges: vscode.DecorationOptions[] = [];

    // 匹配所有标签
    const tagRegex = /(<%[!=@]?)|([^%]*)(%>)/g;
    let match;

    while ((match = tagRegex.exec(text))) {
      let startPos, endPos;
      if (match[1]) {
        // 匹配开始标签
        startPos = activeEditor.document.positionAt(match.index);
        endPos = activeEditor.document.positionAt(
          match.index + match[1].length
        );
      } else {
        // 匹配结束标签
        let start = match.index + match[0].length - match[3].length;
        startPos = activeEditor.document.positionAt(start);
        endPos = activeEditor.document.positionAt(start + match[3].length);
      }

      ranges.push({ range: new vscode.Range(startPos, endPos) });
    }

    activeEditor.setDecorations(tagDecoration, ranges);
  }

  // 初始更新
  if (activeEditor) {
    updateDecorations();
  }

  // 监听编辑器变化
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  // 监听文本变化
  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  // 监听配置变化
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("jstpl.defaultTagColor")) {
      updateDecorations();
    }
  });
}
