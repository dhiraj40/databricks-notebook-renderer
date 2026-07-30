import { ComputeApi } from "../api/computeApi";
import { Connection } from "../models/connection";
import { Compute } from "../models/compute";
import { ComputeState } from "../state/computeState";
import { IWorkspaceStorage } from "../../core/storage/workspaceStorage";
import { StorageKeys } from "../../core/configuration/storageKeys";

export class ComputeService {
    constructor(
        private readonly computeApi: ComputeApi,
        private readonly computeState: ComputeState,
        private readonly workspaceStorage: IWorkspaceStorage
    ) { }

    public async loadComputes(connection: Connection): Promise<Compute[]> {
        const computes = await this.computeApi.listClusters(connection);

        this.computeState.setComputes(computes);

        return computes;
    }

    public getComputes(): Compute[] {
        return this.computeState.getComputes();
    }

    public async selectCompute(computeId: string): Promise<Compute> {
        const compute = this.computeState
            .getComputes()
            .find((c) => c.id === computeId);

        if (!compute) {
            throw new Error(`Compute not found: ${computeId}`);
        }

        this.computeState.setSelectedCompute(compute);
        await this.workspaceStorage.update(StorageKeys.selectedComputeId, compute.id);
        return compute;
    }

    public async restoreSelectedCompute(connection: Connection): Promise<void> {

        const selectedComputeId =
            this.workspaceStorage.get<string>(
                StorageKeys.selectedComputeId
            );

        if (!selectedComputeId) {
            return;
        }

        const computes =
            await this.loadComputes(
                connection
            );

        const compute =
            computes.find(
                c => c.id === selectedComputeId
            );

        if (!compute) {
            return;
        }

        this.computeState.setSelectedCompute(
            compute
        );
    }

    public getSelectedCompute(): Compute | undefined {
        return this.computeState.getSelectedCompute();
    }

    public clear(): void {
        this.computeState.clear();
    }
}
