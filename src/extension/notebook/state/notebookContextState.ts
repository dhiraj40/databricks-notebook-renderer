import { NotebookExecutionContext } from "../models/notebookExecutionContext";

export class NotebookContextState {
    private readonly contexts = new Map<string, NotebookExecutionContext>();

    private getKey(notebookId:string, language:string): string {
        return `${notebookId}::${language}`;
    }

    public getContext(notebookId:string, language:string): NotebookExecutionContext | undefined {
        return this.contexts.get(this.getKey(notebookId, language));
    }

    public setContext(context: NotebookExecutionContext): void {
        this.contexts.set(this.getKey(context.notebookId, context.language), context);
    }

    public removeContext(notebookId:string, language:string): void {
        this.contexts.delete(this.getKey(notebookId, language));
    }

    public getAllContexts(): NotebookExecutionContext[] {
        return Array.from(this.contexts.values());
    }

    public clear(): void {
        this.contexts.clear();
    }
}