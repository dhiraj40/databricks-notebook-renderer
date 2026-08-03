import * as vscode from "vscode";
import { AuthService } from "../../databricks/auth/authService";
import { ComputeService } from "../../databricks/services/computeService";
import { EventBus } from "../../core/events/eventBus";
import { ExtensionEvents } from "../../core/events/extensionEvents";

export class SelectComputeCommand{
    constructor(
        private readonly authService: AuthService,
        private readonly computeService: ComputeService,
        private readonly eventBus: EventBus
    ) {}

    public async execute(): Promise<void> {
        const connection = await this.authService.getConnection();
        if (!connection) {
            vscode.window.showErrorMessage(
                "Please connect to Databricks first."
            );
            return;
        }
        const computes =
            await this.computeService.loadComputes(
                connection
            );

        if (computes.length === 0) {
            vscode.window.showInformationMessage(
                "No compute available."
            );
            return;
        }

        const selected =
            await vscode.window.showQuickPick(
                computes.map(compute => ({
                    label: compute.name,
                    description: compute.state,
                    computeId: compute.id
                })),
                {
                    title: "Select Compute"
                }
            );

        if (!selected) {
            return;
        }

        const compute = await
            this.computeService.selectCompute(
                selected.computeId
            );
        
        this.eventBus.emit(ExtensionEvents.computeChanged);

        vscode.window.showInformationMessage(
            `Selected compute: ${compute.name}`
        );
    }

}