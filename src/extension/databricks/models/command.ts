export interface Command {
    id: string;
    contextId: string;
}

export enum CommandStatus {
    Cancelled = "Cancelled",
    Cancelling = "Cancelling",
    Error = "Error",
    Finished = "Finished",
    Queued = "Queued",
    Running = "Running"
}

export enum CommandResultType {
    Text = "text",
    Error = "error",
    Image = "image",
    Images = "images",
    Table = "table"
}