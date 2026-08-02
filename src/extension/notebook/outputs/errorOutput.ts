import * as vscode from "vscode";

export class ErrorOutput {

    public static create(
        error: string
    ): vscode.NotebookCellOutput {

        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(
                error
            )
        ]);
    }
}