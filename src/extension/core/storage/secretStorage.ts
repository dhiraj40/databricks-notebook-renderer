import * as vscode from "vscode";

export interface ISecretStorage {
    store(key: string, value: string): Promise<void>;
    get(key: string): Promise<string | undefined>;
    delete(key: string): Promise<void>;
}

export class VSCodeSecretStorage implements ISecretStorage{

    constructor(
        private readonly secrets: vscode.SecretStorage
    ) {}

    async store(
        key: string,
        value: string
    ): Promise<void> {
        await this.secrets.store(key, value);
    }

    async get(
        key: string
    ): Promise<string | undefined> {
        return await this.secrets.get(key);
    }

    async delete(
        key: string
    ): Promise<void> {
        await this.secrets.delete(key);
    }
}