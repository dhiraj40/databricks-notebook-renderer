export enum ComputeType {
    Cluster = "cluster",
    Serverless = "serverless"
}

export interface Compute {
    id: string;
    name: string;
    state: string;
    type: ComputeType;
}