import * as vscode from "vscode";

export class DatabricksTreeItem extends vscode.TreeItem {
    
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ){
        super(label, collapsibleState);
    }
}