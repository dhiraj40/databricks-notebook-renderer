import * as vscode from "vscode";

export interface IWorkspaceStorage {
    get<T>(key: string): T | undefined;
    update<T>(key: string, value: T): Thenable<void>;
}

export class VSCodeWorkspaceStorage implements IWorkspaceStorage {

    constructor(
        private readonly workspaceState: vscode.Memento
    ){}

    public get<T>(key: string): T | undefined {
        return this.workspaceState.get<T>(key);
    }

    public update<T>(key: string, value: T): Thenable<void> {
        return this.workspaceState.update(key, value);
    }
    
}