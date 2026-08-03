import * as vscode from "vscode";
import { AuthApi } from "../../databricks/api/authApi";
import { AuthService } from "../../databricks/auth/authService";
import { Connection } from "../../databricks/models/connection";
import { EventBus } from "../../core/events/eventBus";
import { ExtensionEvents } from "../../core/events/extensionEvents";

export class ConnectCommand {

    constructor(
        private readonly authApi: AuthApi,
        private readonly authService: AuthService,
        private readonly eventBus: EventBus
    ){}
    async execute(): Promise<void> {
        const workspaceUrl = await vscode.window.showInputBox({
                title: "Databricks Workspace URL",
                ignoreFocusOut: true
            });

        if (!workspaceUrl){return;}

        const token = await vscode.window.showInputBox({
                title: "Databricks Personal Access Token",
                password: true,
                ignoreFocusOut: true
            });
        if (!token){return;}

        try{
            const connection: Connection = {workspaceUrl: workspaceUrl, token: token};
            const user = await this.authApi.getCurrentUser(connection);

            await this.authService.saveConnection(workspaceUrl, token);
            
            this.eventBus.emit(ExtensionEvents.connectionChanged);

            console.log(`ConnectCommand: ${user}`);

            vscode.window.showInformationMessage( `Connected as ${user.displayName}`);
        } catch(error){
            vscode.window.showErrorMessage(
                error instanceof Error ? error.message : "Authentication failed"
            );
        }
    }
}