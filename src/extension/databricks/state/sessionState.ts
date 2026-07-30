import { Session } from "../models/session";


export class SessionState {
    private activeSession?: Session;

    public setSession(session: Session): void {
        this.activeSession = session;
    }

    public getSession(): Session | undefined {
        return this.activeSession;
    }

    public hasSession(): boolean {
        return this.activeSession !== undefined;
    }
    
    public clear(): void {
        this.activeSession = undefined;
    }

}