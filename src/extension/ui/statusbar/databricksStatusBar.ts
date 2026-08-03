import * as vscode from "vscode";

export class DatabricksStatusBar implements vscode.Disposable {

    private readonly connectionItem: vscode.StatusBarItem;
    private readonly computeItem: vscode.StatusBarItem;

    constructor(){
        this.connectionItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left, 100
        );

        this.computeItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left, 99
        );

        this.computeItem.command = "databricksNotebookRenderer.selectCompute";
        this.computeItem.tooltip = "Select Databricks Compute";

        this.connectionItem.show();
        this.computeItem.show();
    }


    public setConnected(): void {
        this.connectionItem.text = "$(plug) Connected";
    }

    public setDisconnected(): void {
        this.connectionItem.text = "$(debug-disconnect) Disconnected";
    }

    public setCompute(computeName: string): void {
        this.computeItem.text = `$(server) ${computeName}`;
    }

    public clearCompute(): void {
        this.computeItem.text = "$(server) No Compute";
    }

    dispose() {
        this.connectionItem.dispose();
        this.computeItem.dispose();
    }

}