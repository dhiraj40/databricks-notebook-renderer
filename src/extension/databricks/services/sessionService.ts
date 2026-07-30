import { EventBus } from "../../core/events/eventBus";
import { SessionApi } from "../api/sessionApi";
import { Connection } from "../models/connection";
import { Session } from "../models/session";
import { SessionState } from "../state/sessionState";

export class SessionService {
    constructor(
        private readonly sessionApi: SessionApi,
        private readonly sessionState: SessionState,
        private readonly eventBus: EventBus
    ) { }

    public async createSession(
        connection: Connection,
        clusterId: string,
        language: string = "python"
    ): Promise<Session> {
        const session = await this.sessionApi.createSession(
            connection, clusterId, language
        );

        this.sessionState.setSession(session);

        return session;
            
    }
    
    public getSession(): Session | undefined {
        return this.sessionState.getSession();
    }

    public hasSession(): boolean {
        return this.sessionState.hasSession();
    }

    public async getOrCreateSession(
        connection: Connection,
        clusterId: string,
        language: string = "python"
    ): Promise<Session> {
        const session = this.sessionState.getSession();
        if (session) {
            return session;
        }
        return this.createSession(connection, clusterId, language);
    }

    public async destroySession(
        connection: Connection
    ): Promise<void> {
        const session = this.sessionState.getSession();
        if (!session) {
            return ;
        }
        await this.sessionApi.deleteSession(
            connection,
            session.clusterId,
            session.id
        );

        this.sessionState.clear();
    }
        

    public clear(): void {
        this.sessionState.clear();
    }
}