import * as vscode from "vscode";

export class JstplSemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider
{
  provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    // 分析文档内容，返回语义标记
    const builder = new vscode.SemanticTokensBuilder();

    // 示例：查找所有 <% ... %> 标签
    const scriptletRegex = /<%([\s\S]*?)%>/g;
    let match;
    while ((match = scriptletRegex.exec(document.getText()))) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);

      // 为scriptlet标签添加语义标记
      builder.push(
        startPos.line,
        startPos.character,
        endPos.character - startPos.character,
        0, // token type index (scriptlet)
        1 // token modifier index (embedded)
      );
    }

    return builder.build();
  }
}

export function registerJstplSemantic(context: vscode.ExtensionContext) {
  // 定义语义标记类型和修饰符
  const tokenTypes = ["scriptlet", "scriptlet2", "expression", "directive"];
  const tokenModifiers = ["embedded"];
  const tokenTypesLegend = new vscode.SemanticTokensLegend(
    tokenTypes,
    tokenModifiers
  );

  // 注册语义高亮提供者
  const provider = vscode.languages.registerDocumentSemanticTokensProvider(
    { language: "jstpl" },
    new JstplSemanticTokensProvider(),
    tokenTypesLegend
  );

  context.subscriptions.push(provider);
}
