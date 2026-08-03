import * as vscode from "vscode";

export class TextOutput {

    public static create(
        text: string
    ): vscode.NotebookCellOutput {

        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(
                text
            )
        ]);
    }
}