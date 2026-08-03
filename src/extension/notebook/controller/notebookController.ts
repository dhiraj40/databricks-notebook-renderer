import * as vscode from "vscode";
import { CellExecutionService } from "../execution/cellExecutionService";
import { NotebookTypeDefinition } from "../models/NotebookTypeDefinition";
import { OutputFactory } from "../outputs/outputFactory";

export const DATABRICKS_NOTEBOOK_TYPE = {
    DATABRICKS_NOTEBOOK_RENDERER: {
        type: "databricks-notebook-renderer",
        label: "Databricks Notebook",
        id: "databricks-notebook-renderer-controller"
    } as NotebookTypeDefinition,
    DATABRICKS_PYTHON_NOTEBOOK: {
        type: "databricks-python-renderer",
        label: "Databricks Python Notebook",
        id: "databricks-python-renderer-controller"
    } as NotebookTypeDefinition,
    DATABRICKS_JUPYTER_NOTEBOOK: {
        type: "jupyter-notebook",
        label: "Databricks Jupyter Notebook",
        id: "databricks-jupyter-notebook-controller"
    } as NotebookTypeDefinition
} as const satisfies Record<string, NotebookTypeDefinition>;

export class NotebookController  implements vscode.Disposable {

    private readonly controller: vscode.NotebookController;

    constructor(
        private readonly cellExecutionService: CellExecutionService,
        private readonly notebookTypeDefinition: NotebookTypeDefinition
    ){
        this.controller = vscode.notebooks.createNotebookController(
            notebookTypeDefinition.id,
            notebookTypeDefinition.type,
            notebookTypeDefinition.label
        );

        this.controller.supportedLanguages = [
            "python", "sql", "r", "scala"
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
            const notebookId = cell.notebook.uri.toString();
            const result = await this.cellExecutionService.executeCell(code, notebookId, cell.document.languageId);
            const _output = OutputFactory.create(result);

            execution.replaceOutput([_output]);
            execution.end(true, Date.now());
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