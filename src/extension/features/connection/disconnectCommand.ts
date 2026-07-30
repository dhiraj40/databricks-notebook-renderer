import * as vscode from "vscode";
import { AuthService } from "../../databricks/auth/authService";
import { EventBus } from "../../core/events/eventBus";
import { ExtensionEvents } from "../../core/events/extensionEvents";

export class DisconnectCommand {

    constructor(
        private readonly authService: AuthService,
        private readonly eventBus: EventBus
    ) {}

    public async execute(): Promise<void> {

        await this.authService.disconnect();

        this.eventBus.emit(ExtensionEvents.connectionChanged);

        vscode.window.showInformationMessage(
            "Disconnected from Databricks"
        );
    }
}