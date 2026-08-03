import * as vscode from "vscode";
import { TreeNode } from "../models/treeNode";

export class ConnectionNode extends TreeNode {

    constructor(
        connected: boolean
    ) {
        super(
            connected ? "Connected" : "Disconnected"
        );

        this.iconPath = new vscode.ThemeIcon(
            connected ? "plug" : "debug-disconnect"
        );
    }
}