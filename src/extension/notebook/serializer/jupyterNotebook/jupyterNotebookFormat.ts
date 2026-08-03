export interface JupyterNotebook {
    cells: JupyterCell[];
    metadata?: Record<string, unknown>;
    nbformat: number;
    nbformat_minor: number;
}

export interface JupyterCell {
    cell_type: "code" | "markdown" | "raw";
    source: string[] | string;
    metadata?: Record<string, unknown>;
    outputs?: unknown[];
    execution_count?: number | null;
}