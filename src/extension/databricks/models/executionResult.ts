export type ExecutionResultType =
    "text" |
    "html" |
    "json" |
    "image" |
    "table" |
    "error";

export interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    resultType?: ExecutionResultType;
    mimeType?: string;
}

export interface DatabricksTableColumn {
    name: string;
    type?: string;
    metadata?: string;
}

