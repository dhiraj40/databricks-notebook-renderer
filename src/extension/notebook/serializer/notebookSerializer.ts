import * as vscode from "vscode";

interface SerializedCell {
    language: string;
    value: string;
}

export class NotebookSerializer implements vscode.NotebookSerializer {
    public async deserializeNotebook(
        content: Uint8Array,
    ): Promise<vscode.NotebookData> {
        if (content.length === 0) {
            return new vscode.NotebookData([
                new vscode.NotebookCellData(vscode.NotebookCellKind.Code, "", "python"),
            ]);
        }

        const contents = new TextDecoder().decode(content);

        const cells = JSON.parse(contents) as SerializedCell[];

        return new vscode.NotebookData(
            cells.map(
                (cell) =>
                    new vscode.NotebookCellData(
                        vscode.NotebookCellKind.Code,
                        cell.value,
                        cell.language,
                    ),
            ),
        );
    }

    public async serializeNotebook(
        data: vscode.NotebookData,
    ): Promise<Uint8Array> {
        const contents: SerializedCell[] = data.cells.map((cell) => ({
            language: cell.languageId,
            value: cell.value,
        }));

        return new TextEncoder().encode(JSON.stringify(contents, null, 2));
    }
}
