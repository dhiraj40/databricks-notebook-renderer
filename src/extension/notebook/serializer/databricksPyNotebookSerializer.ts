import * as vscode from "vscode";
import { DatabricksSourceParser } from "./databricks/databricksSourceParser";
import { DatabricksSourceWriter } from "./databricks/databricksSourceWriter";
import { DatabricksSourceCell, DatabricksSourceCellKind } from "./databricks/databricksSourceFormat";

export class DatabricksPyNotebookSerializer implements vscode.NotebookSerializer{
    private readonly parser = new DatabricksSourceParser();
    private readonly writer = new DatabricksSourceWriter();

    public async deserializeNotebook(content: Uint8Array, token: vscode.CancellationToken): Promise<vscode.NotebookData> {
        
        const cells = this.parser.parse(Buffer.from(content).toString("utf8"));
        const notebookCells = cells.map(cell => this.toNotebookCellData(cell));

        return new vscode.NotebookData(notebookCells);

    }
    public async serializeNotebook(data: vscode.NotebookData, token: vscode.CancellationToken): Promise<Uint8Array> {
        
        const sourceCells = data.cells.map(cell => this.toDatabriccksSourceCell(cell));
        const source = this.writer.write(sourceCells);
        return Buffer.from(source, "utf8");
    }

    private toDatabriccksSourceCell(cell: vscode.NotebookCellData): DatabricksSourceCell {
        return {
            kind: cell.kind === vscode.NotebookCellKind.Markup ? DatabricksSourceCellKind.Markdown : DatabricksSourceCellKind.Code,
            languageId: cell.languageId,
            source: cell.value
        };
    }

    private toNotebookCellData(cell: DatabricksSourceCell): vscode.NotebookCellData {
        return new vscode.NotebookCellData(
            cell.kind === DatabricksSourceCellKind.Markdown ? vscode.NotebookCellKind.Markup : vscode.NotebookCellKind.Code,
            cell.source,
            cell.languageId
        );
    }
    
}