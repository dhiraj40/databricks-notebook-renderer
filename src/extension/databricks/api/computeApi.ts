import cluster from 'cluster';
import {DatabricksApiEndpoints} from '../constants/apiEndpoints';
import { Compute, ComputeType } from '../models/compute';
import { Connection } from '../models/connection';
import { ClusterResponse, ClustersResponse } from '../models/response';

export class ComputeApi {
    /**
     * listClusters
    */
    public async listClusters(connection: Connection): Promise<Compute[]> {
        const endpoint = `${connection.workspaceUrl}${DatabricksApiEndpoints.CLUSTERS_LIST}`;
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${connection.token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `Authentication failed (${response.status})`
            );
        }

        const data = await response.json() as ClustersResponse;
        const result = (data.clusters ?? []).map(cluster => ({
            id: cluster.cluster_id,
            name: cluster.cluster_name,
            state: cluster.state,
            type: ComputeType.Cluster
        }));
        return result; 
        
    }
}