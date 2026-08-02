import * as vscode from "vscode";
import { ExecutionResult } from "../models/executionResult";
import { ErrorOutput } from "./errorOutput";
import { TextOutput } from "./textOutput";

export class OutputFactory {

    public static create(
        result: ExecutionResult
    ): vscode.NotebookCellOutput {

        if (!result.success) {
            return ErrorOutput.create(
                result.error ?? "Execution failed"
            );
        }

        return TextOutput.create(
            result.output ?? ""
        );
    }
}