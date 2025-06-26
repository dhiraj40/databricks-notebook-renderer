// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

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

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      'databricks-notebook-renderer',  // this matches the notebookType
      databricksNotebookSerializer,
      { transientOutputs: false }
    )
  );
}


// This method is called when your extension is deactivated
export function deactivate() { }
