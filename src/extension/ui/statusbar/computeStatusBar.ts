import * as vscode from "vscode";

export class ComputeStatusBar {
    private readonly statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

    constructor (){
        this.statusBarItem.command =  "databricksNotebookRenderer.selectCompute";
        this.statusBarItem.tooltip =  "Select Databricks Compute";
    }

    public update(computeName?: string): void{
        this.statusBarItem.text = computeName ? `$(server) ${computeName}`: "$(server) No Compute";
        this.statusBarItem.show();
    }
}