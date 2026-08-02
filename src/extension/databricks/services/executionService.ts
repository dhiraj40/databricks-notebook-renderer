import { CommandApi } from "../api/commandApi";
import { Connection } from "../models/connection";
import { ExecutionResult } from "../../notebook/models/executionResult";
import { CommandResultType, CommandStatus } from "../models/command";
import { Session } from "../models/session";

export class ExecutionService {
    constructor(
        private readonly commandApi: CommandApi,
        private readonly timeoutMilliseconds: number = 120_000
    ) { }

    public async execute(
        connection: Connection,
        clusterId: string,
        session: Session,
        code: string,
        language: string = "python"
    ): Promise<ExecutionResult> {
        const command = await this.commandApi.executeCommand(connection, clusterId, session.id, language, code);
        let result;
        const deadline = Date.now() + this.timeoutMilliseconds;

        do {
            const remainingMilliseconds = deadline - Date.now();
            if (remainingMilliseconds <= 0) {
                throw new Error("Timed out waiting for the Databricks command to finish.");
            }

            await this.delay(Math.min(500, remainingMilliseconds));
            result = await this.commandApi.getCommandStatus(connection, clusterId, session.id, command.id);
        } while(
            result.status === CommandStatus.Queued ||
            result.status === CommandStatus.Running ||
            result.status === CommandStatus.Cancelling
        );

        switch (result.status) {
            case CommandStatus.Finished:
                if (result.resultType === CommandResultType.Text) {
                    return {
                        success: true,
                        output: result.data ?? ""
                    };
                }
                if (result.resultType === CommandResultType.Error) {
                    return {
                        success: false,
                        error: result.error ?? "Command execution failed."
                    };
                }
                throw new Error(
                    `Unsupported command result type: ${result.resultType ?? "unknown"}`
                );

            case CommandStatus.Error:
                return {
                    success: false,
                    error: result.error ?? "Command execution failed."
                };

            case CommandStatus.Cancelled:
                return {
                    success: false,
                    output: "",
                    error: "Command was cancelled."
                };

            default:
                throw new Error(
                    `Unexpected command status: ${result.status}`
                );
        }

    }

    private async delay(milliseconds: number): Promise<void>{
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }
}
