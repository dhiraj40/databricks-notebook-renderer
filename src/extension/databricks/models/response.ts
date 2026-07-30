export interface CurrentUserResponse {
    userName: string;
    displayName: string;
}

export interface ClusterResponse {
    cluster_id: string;
    cluster_name: string;
    state: string;
}

export interface ClustersResponse {
    clusters?: ClusterResponse[];
}