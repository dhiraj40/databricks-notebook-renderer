import * as vscode from 'vscode';

export const databricksNotebookSerializer: vscode.NotebookSerializer = {
  deserializeNotebook(content: Uint8Array): vscode.NotebookData {
    const text = new TextDecoder().decode(content);

    const cells = text
      .split(/^# COMMAND ----------.*$/gm)  // Split at COMMAND markers
      .map(block => block.trim())
      .filter(Boolean)
      .map(code => new vscode.NotebookCellData(
        vscode.NotebookCellKind.Code,
        code,
        'python'
      ));

    return new vscode.NotebookData(cells);
  },

  serializeNotebook(data: vscode.NotebookData): Uint8Array {
    const contents = data.cells.map(cell => `# COMMAND ----------\n${cell.value}`).join('\n\n');
    return new TextEncoder().encode(contents);
  }
};
