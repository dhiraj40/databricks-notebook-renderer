import { Session } from "../../databricks/models/session";


export interface NotebookExecutionContext {
    notebookId: string
    language: string
    session: Session
    computeId: string
}