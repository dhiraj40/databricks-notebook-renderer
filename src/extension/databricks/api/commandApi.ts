import { DatabricksApiEndpoints } from "../constants/apiEndpoints";
import { Command } from "../models/command";
import { CommandResult } from "../models/commandResult";
import { Connection } from "../models/connection";

export class CommandApi {

    public async executeCommand(
        connection: Connection,
        clusterId: string,
        contextId: string,
        language: string,
        command: string
    ): Promise<Command> {

        const response = await fetch(
            `${connection.workspaceUrl}${DatabricksApiEndpoints.COMMAND_EXECUTE}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${connection.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    clusterId,
                    contextId,
                    language,
                    command
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Failed to execute command (${response.status})`
            );
        }

        const data = await response.json() as any;

        return {
            id: data.id,
            contextId
        };
    }

    public async getCommandStatus(
        connection: Connection,
        clusterId: string,
        contextId: string,
        commandId: string
    ): Promise<CommandResult> {

        const response = await fetch(
            `${connection.workspaceUrl}${DatabricksApiEndpoints.COMMAND_STATUS}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${connection.token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Failed to get command status (${response.status})`
            );
        }

        const data = await response.json() as any;

        return {
            status: data.status,
            resultType: data.results?.resultType,
            data: data.results?.data,
            error: data.results?.cause
        };
    }
}