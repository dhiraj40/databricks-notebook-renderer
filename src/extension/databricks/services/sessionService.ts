import { SessionApi } from "../api/sessionApi";
import { Connection } from "../models/connection";
import { Session } from "../models/session";

export class SessionService {
    constructor(
        private readonly sessionApi: SessionApi
    ) { }

    public async createSession(
        connection: Connection,
        clusterId: string,
        language: string = "python"
    ): Promise<Session> {
        const session = await this.sessionApi.createSession(
            connection, clusterId, language
        );
        return session;
            
    }

    public async destroySession(
        connection: Connection, session: Session
    ): Promise<void> {
        await this.sessionApi.deleteSession(
            connection,
            session.clusterId,
            session.id
        );
    }

    public async destroyAllSessions(
        connection: Connection, sessions: Session[]
    ): Promise<void> {
        for (const session of sessions){
            await this.destroySession(connection, session);
        }
    }
}