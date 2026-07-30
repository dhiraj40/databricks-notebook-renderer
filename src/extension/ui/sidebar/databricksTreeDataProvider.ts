import * as vscode from "vscode";
import { DatabricksTreeItem } from "./databricksTreeItem";
import { AuthService } from "../../databricks/auth/authService";
import { ComputeService } from "../../databricks/services/computeService";
import { SessionService } from "../../databricks/services/sessionService";
import { EventBus } from "../../core/events/eventBus";
import { ExtensionEvents } from "../../core/events/extensionEvents";

export class DatabricksTreeDataProvider implements vscode.TreeDataProvider<DatabricksTreeItem> {

    private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private readonly authService: AuthService,
        private readonly computeService: ComputeService,
        private readonly sessionService: SessionService,
        eventBus: EventBus
    ){
        eventBus.subscribe(ExtensionEvents.connectionChanged, () => this.refresh());
        eventBus.subscribe(ExtensionEvents.computeChanged, () => this.refresh());
        eventBus.subscribe(ExtensionEvents.sessionChanged, () => this.refresh());
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: DatabricksTreeItem): vscode.TreeItem{
        return element;
    }

    public async getChildren(): Promise<DatabricksTreeItem[]> {
        const connected = await this.authService.isAuthenticated();
        const compute = this.computeService.getSelectedCompute();
        const session = this.sessionService.getSession();

        return [
            new DatabricksTreeItem(`Connection: ${connected ? "Connected": "Disconnected"}`),
            new DatabricksTreeItem(`Compute: ${compute?.name ?? "None"}`),
            new DatabricksTreeItem(`Session: ${session?.id ?? "None"}`)
        ];

    }
    public getParent?(element: DatabricksTreeItem): vscode.ProviderResult<DatabricksTreeItem> {
        throw new Error("Method not implemented.");
    }
    public resolveTreeItem?(item: vscode.TreeItem, element: DatabricksTreeItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
        throw new Error("Method not implemented.");
    }
    
}