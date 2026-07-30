import * as vscode from "vscode";
import { DatabricksTreeDataProvider } from "./databricksTreeDataProvider";

export class DatabricksView implements vscode.Disposable{

    private readonly treeView: vscode.TreeView<any>;

    constructor(
        private readonly provider: DatabricksTreeDataProvider
    ){
        this.treeView = vscode.window.createTreeView(
            "databricksExplorer",
            {
                treeDataProvider: provider
            }
        );
    }
    public dispose(): void {
        this.treeView.dispose();
    }
}