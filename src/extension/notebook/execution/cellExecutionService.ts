import { EventBus } from "../../core/events/eventBus";
import { ExtensionEvents } from "../../core/events/extensionEvents";
import { AuthService } from "../../databricks/auth/authService";
import { ComputeService } from "../../databricks/services/computeService";
import { ExecutionService } from "../../databricks/services/executionService";
import { SessionService } from "../../databricks/services/sessionService";
import { ExecutionResult } from "../models/executionResult";
import { NotebookContextState } from "../state/notebookContextState";

export class CellExecutionService {
    constructor(
        private readonly authService: AuthService,
        private readonly computeService: ComputeService,
        private readonly sessionService: SessionService,
        private readonly executionService: ExecutionService,
        private readonly notebookContextState: NotebookContextState,
        private readonly eventBus: EventBus
    ){

    }

    public async executeCell(code: string, notebookId: string, language:string = "python"): Promise<ExecutionResult>{
        const connection =  await this.authService.getConnection();
        if(!connection){
            throw new Error("Not connected to Databricks.");
        }
        const selectedCompute = this.computeService.getSelectedCompute();

        if(!selectedCompute){
            throw new Error("No Compute selected.");
        }

        let context = this.notebookContextState.getContext(notebookId, language);
        if (context && context.computeId !== selectedCompute.id) {
            await this.sessionService.destroySession(connection, context.session);
            this.notebookContextState.removeContext(notebookId, language);
            context = undefined;
        }

        if (!context) {
            const session = await this.sessionService.createSession(connection, selectedCompute.id, language);
            context = {
                notebookId,
                language,
                computeId: selectedCompute.id,
                session
            };
            this.notebookContextState.setContext(context);
            this.eventBus.emit(ExtensionEvents.sessionChanged);
        }
        return this.executionService.execute(connection, selectedCompute.id, context.session, code, language);
    }
}
