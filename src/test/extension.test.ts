import * as assert from "assert";
import * as vscode from "vscode";

const extensionId = "dhiraj-k.databricks-notebook-renderer";
const commandIds = [
    "databricksNotebookRenderer.connect",
    "databricksNotebookRenderer.disconnect",
    "databricksNotebookRenderer.selectCompute"
];

suite("Databricks Notebook Renderer", () => {
    let extension: vscode.Extension<unknown>;

    suiteSetup(async () => {
        extension = vscode.extensions.getExtension(extensionId)!;
        assert.ok(extension, `Extension '${extensionId}' should be available`);

        await extension.activate();
    });

    test("activates successfully", () => {
        assert.strictEqual(extension.isActive, true);
    });

    test("registers its connection and compute commands", async () => {
        const registeredCommands = await vscode.commands.getCommands(true);

        for (const commandId of commandIds) {
            assert.ok(
                registeredCommands.includes(commandId),
                `Expected command '${commandId}' to be registered`
            );
        }
    });

    test("declares Databricks notebook types", () => {
        const notebooks = extension.packageJSON.contributes.notebooks as Array<{
            type: string;
        }>;
        const notebookTypes = notebooks.map((notebook) => notebook.type);

        assert.ok(notebookTypes.includes("databricks-notebook-renderer"));
        assert.ok(notebookTypes.includes("databricks-python-renderer"));
    });
});
