import * as vscode from "vscode";
import { AuthService } from "../../databricks/auth/authService";
import { EventBus } from "../../core/events/eventBus";
import { ExtensionEvents } from "../../core/events/extensionEvents";
import { SessionService } from "../../databricks/services/sessionService";
import { NotebookContextState } from "../../notebook/state/notebookContextState";

export class DisconnectCommand {

    constructor(
        private readonly authService: AuthService,
        private readonly eventBus: EventBus,
        private readonly sessionService: SessionService,
        private readonly notebookContextState: NotebookContextState
    ) {}

    public async execute(): Promise<void> {

        const connection = await this.authService.getConnection();
        if(connection){
            await this.sessionService.destroyAllSessions(
                connection,
                this.notebookContextState.getAllContexts().map(context => context.session)
            );
            this.notebookContextState.clear();
        }
        await this.authService.disconnect();

        this.eventBus.emit(ExtensionEvents.connectionChanged);

        vscode.window.showInformationMessage(
            "Disconnected from Databricks"
        );
    }
}
