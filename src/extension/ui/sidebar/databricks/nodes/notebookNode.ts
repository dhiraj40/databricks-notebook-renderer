import * as vscode from "vscode";

import { TreeNode } from "../models/treeNode";

export class NotebooksNode extends TreeNode {

    constructor() {
        super(
            "Notebooks",
            vscode.TreeItemCollapsibleState.Expanded
        );

        this.iconPath =
            new vscode.ThemeIcon("notebook");

        this.contextValue =
            "databricksNotebooks";
    }
}

export class NotebookNode extends TreeNode {

    public readonly notebookId: string;

    constructor(
        notebookId: string,
        label: string
    ) {
        super(
            label,
            vscode.TreeItemCollapsibleState.Collapsed
        );

        this.notebookId = notebookId;

        this.iconPath =
            new vscode.ThemeIcon("notebook");

        this.contextValue =
            "databricksNotebook";

        // Keep the complete URI available without displaying it
        // directly in the tree.
        this.tooltip = notebookId;
    }
}