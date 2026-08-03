import * as vscode from "vscode";
import { ExecutionResult } from "../../databricks/models/executionResult";
import { ErrorOutput } from "./errorOutput";
import { TextOutput } from "./textOutput";
import { TableOutput } from "./tableOutput";

export class OutputFactory {

    public static create(
        result: ExecutionResult
    ): vscode.NotebookCellOutput {

        if (!result.success) {
            return ErrorOutput.create(
                result.error ?? "Execution failed"
            );
        }

        console.log("OutputFactory: ", JSON.stringify(result, null, 2))

        if(result.resultType === "table"){
            return TableOutput.create(result.output ?? "");
        }

        return TextOutput.create(
            result.output ?? ""
        );
    }
}