import { DatabricksApiEndpoints } from "../constants/apiEndpoints";
import { Connection } from "../models/connection";

import { Session } from "../models/session";

export class SessionApi {

    public async createSession(
        connection: Connection,
        clusterId: string,
        language: string = "python"
    ): Promise<Session> {

        const response = await fetch(
            `${connection.workspaceUrl}${DatabricksApiEndpoints.CREATE_CONTEXT}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${connection.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    clusterId,
                    language
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Failed to create session (${response.status})`
            );
        }

        const data = await response.json() as any;

        return {
            id: data.id,
            clusterId,
            language
        };
    }

    public async deleteSession(
        connection: Connection,
        clusterId: string,
        sessionId: string
    ): Promise<void> {

        const response = await fetch(
            `${connection.workspaceUrl}${DatabricksApiEndpoints.DESTROY_CONTEXT}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${connection.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    clusterId,
                    contextId: sessionId
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Failed to delete session (${response.status})`
            );
        }
    }
}