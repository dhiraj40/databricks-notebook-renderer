import * as vscode from "vscode";
import { DatabricksTableColumn } from "../../databricks/models/executionResult";



export class TableOutput {

    public static create(data: string): vscode.NotebookCellOutput {
        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(
                data,
                "text/html"
            )
        ]);
    }
}