import * as vscode from "vscode";
import { TreeNode } from "../models/treeNode";

export class ComputeNode extends TreeNode {

    constructor(
        computeName?: string
    ) {
        super(
            computeName ?? "No Compute Selected"
        );

        this.iconPath =
            new vscode.ThemeIcon("server");
    }
}