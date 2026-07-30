import { Compute } from "../models/compute";

export class ComputeState {
    private computes: Compute[] = [];

    private selectedCompute?: Compute;

    public setComputes(computes: Compute[]): void {
        this.computes = computes;
    }

    public getComputes(): Compute[] {
        return this.computes;
    }

    public setSelectedCompute(compute: Compute): void {
        this.selectedCompute = compute;
    }

    public getSelectedCompute(): Compute | undefined {
        return this.selectedCompute;
    }

    public clear(): void {
        this.computes = [];
        this.selectedCompute = undefined;
    }
}
