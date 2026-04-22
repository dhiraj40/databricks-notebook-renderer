import * as vscode from 'vscode';
import {
  databricksNotebookSerializer,
  deserializeDatabricksNotebook,
  serializeDatabricksNotebook,
} from './notebookSerializer';

export {
  databricksNotebookSerializer,
  deserializeDatabricksNotebook,
  serializeDatabricksNotebook,
};

const notebookType = 'databricks-notebook-renderer';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      notebookType,
      databricksNotebookSerializer,
      { transientOutputs: false }
    )
  );
}

export function deactivate() { }
