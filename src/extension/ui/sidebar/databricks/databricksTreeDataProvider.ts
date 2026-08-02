import * as vscode from "vscode";
import { DatabricksTreeItem } from "../databricksTreeItem";
import { AuthService } from "../../../databricks/auth/authService";
import { ComputeService } from "../../../databricks/services/computeService";
import { SessionService } from "../../../databricks/services/sessionService";
import { EventBus } from "../../../core/events/eventBus";
import { ExtensionEvents } from "../../../core/events/extensionEvents";
// import * as TreeNodeModule  from "./models/treeNode";
import { ConnectionNode } from "./nodes/connectionNode";
import { ComputeNode } from "./nodes/computeNode";
import { NotebookNode, NotebooksNode } from "./nodes/notebookNode";
import { TreeNode } from "./models/treeNode";
import { NotebookContextState } from "../../../notebook/state/notebookContextState";
import { LanguageNode } from "./nodes/languageNode";

export class DatabricksTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private readonly authService: AuthService,
        private readonly computeService: ComputeService,
        private readonly notebookContextState: NotebookContextState,
        eventBus: EventBus,
    ) {
        eventBus.subscribe(ExtensionEvents.connectionChanged, () => this.refresh());
        eventBus.subscribe(ExtensionEvents.computeChanged, () => this.refresh());
        eventBus.subscribe(ExtensionEvents.sessionChanged, () => this.refresh());
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            return this.getRootNodes();
        }

        if (element instanceof NotebooksNode) {
            return this.getNotebookNodes();
        }

        if (element instanceof NotebookNode) {
            return this.getLanguageNodes(element.notebookId);
        }
        
        return [];
    }

    public getParent?(element: TreeNode): vscode.ProviderResult<TreeNode> {
        throw new Error("Method not implemented.");
    }

    public resolveTreeItem?(
        item: vscode.TreeItem,
        element: TreeNode,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TreeItem> {
        throw new Error("Method not implemented.");
    }

    private async getRootNodes(): Promise<TreeNode[]> {
        const connected = await this.authService.isAuthenticated();
        const compute = this.computeService.getSelectedCompute();

        return [
            new ConnectionNode(connected),
            new ComputeNode(compute?.name),
            new NotebooksNode(),
        ];
    }

    private getNotebookNodes(): NotebookNode[] {
        const contexts = this.notebookContextState.getAllContexts();

        const nodes = contexts.map(
            (context) =>
                new NotebookNode(
                    context.notebookId,
                    this.getNotebookLabel(context.notebookId),
                ),
        );
        return nodes;
    }

    private getNotebookLabel(notebookId: string): string {
        try {
            const uri = vscode.Uri.parse(notebookId);

            const label = uri.toString().split("/").pop();

            return label ?? notebookId;
        } catch {
            return notebookId;
        }
    }

    private getLanguageNodes(notebookId: string): LanguageNode[] {
        const languages = new Set<string>();
        this.notebookContextState
            .getAllContexts()
            .filter((context) => context.notebookId === notebookId)
            .forEach((context) => languages.add(context.language));

        return Array.from(languages)
            .sort((left, right) => left.localeCompare(right))
            .map((language) => new LanguageNode(language));
    }
}