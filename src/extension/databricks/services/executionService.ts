import { CommandApi } from "../api/commandApi";
import { Connection } from "../models/connection";
import { SessionService } from "./sessionService";
import { ExecutionResult } from "../../notebook/models/executionResult";

export class ExecutionService {
    constructor(
        private readonly commandApi: CommandApi,
        private readonly sessionService: SessionService
    ) { }

    public async execute(
        connection: Connection,
        clusterId: string,
        code: string,
        language: string = "python"
    ): Promise<ExecutionResult> {
        const session = await this.sessionService.getOrCreateSession(connection, clusterId, language);
        const command = await this.commandApi.executeCommand(connection, clusterId, session.id, language, code);
        const result = await this.commandApi.getCommandStatus(connection, clusterId, session.id, command.id);

        return {
            success: result.status === "Finished",
            output: result.data,
            error: result.error
        };

    }
}