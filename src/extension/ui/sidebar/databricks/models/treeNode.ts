import * as vscode from "vscode";

export abstract class TreeNode extends vscode.TreeItem {
    
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ){
        super(label, collapsibleState);
    }
}