import * as vscode from "vscode";
import { CellExecutionService } from "../execution/cellExecutionService";

export class NotebookController  implements vscode.Disposable {

    private readonly controller: vscode.NotebookController;

    constructor(
        private readonly cellExecutionService: CellExecutionService
    ){
        this.controller = vscode.notebooks.createNotebookController(
            "databricks-notebook-controller",
            "databricks-notebook-renderer",
            "Databricks Notebook"
        );

        this.controller.supportedLanguages = [
            "python"
        ];

        this.controller.executeHandler = this.execute.bind(this);
    }

    private async execute(
        cells: vscode.NotebookCell[],
        notebook: vscode.NotebookDocument,
        controller: vscode.NotebookController
    ): Promise<void> {
        
        for (const cell of cells){
            await this.executeCell(cell, controller);
        }
    }

    private async executeCell(
        cell: vscode.NotebookCell,
        controller: vscode.NotebookController
    ): Promise<void> {

        const execution = controller.createNotebookCellExecution(cell);
        execution.start(Date.now());

        try {
            const code = cell.document.getText();
            const result = await this.cellExecutionService.executeCell(code);

            if (result.success){
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text(result.output ?? "")
                    ])
                ]);
                execution.end(true, Date.now());
            }
            else{
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.error(new Error(result.error ?? "Execution failed"))
                    ])
                ]);
                execution.end(false, Date.now());
            }
        } catch (error) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.error(
                        error instanceof Error
                            ? error
                            : new Error(String(error))
                    )
                ])
            ]);
            execution.end(false, Date.now());
        }
    }

    public dispose(): void {
        this.controller.dispose();
    }

}