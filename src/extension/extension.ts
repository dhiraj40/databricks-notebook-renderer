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

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      'databricks-notebook-renderer',
      databricksNotebookSerializer,
      { transientOutputs: false }
    )
  );
}

export function deactivate() { }
