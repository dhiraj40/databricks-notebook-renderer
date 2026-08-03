import * as vscode from 'vscode';

export class CommandRegistry {
    constructor(
        private readonly context: vscode.ExtensionContext
    ){}

    register(
        commandId: string,
        callback: (...args: unknown[]) => unknown
    ): void {
        this.context.subscriptions.push(
            vscode.commands.registerCommand(commandId, callback)
        );
    }
}