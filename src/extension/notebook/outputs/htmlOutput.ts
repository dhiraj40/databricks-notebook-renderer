import * as vscode from "vscode";

export class HtmlOutput {

    public static create(
        html: string
    ): vscode.NotebookCellOutput {

        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(
                html,
                "text/html"
            )
        ]);
    }
}