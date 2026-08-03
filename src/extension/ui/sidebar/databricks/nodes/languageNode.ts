import * as vscode from "vscode";

import { TreeNode } from "../models/treeNode";

export class LanguageNode extends TreeNode {

    public readonly language: string;

    constructor(
        language: string
    ) {
        super(
            language,
            vscode.TreeItemCollapsibleState.None
        );

        this.language = language;

        this.iconPath =
            new vscode.ThemeIcon("code");

        this.contextValue =
            "databricksNotebookLanguage";
    }
}