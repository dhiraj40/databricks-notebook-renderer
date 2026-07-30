import { AuthService } from "../../databricks/auth/authService";
import { ComputeService } from "../../databricks/services/computeService";
import { ExecutionService } from "../../databricks/services/executionService";
import { ExecutionResult } from "../models/executionResult";

export class CellExecutionService {
    constructor(
        private readonly authService: AuthService,
        private readonly computeService: ComputeService,
        private readonly executionService: ExecutionService
    ){

    }

    public async executeCell(code: string, language:string = "python"): Promise<ExecutionResult>{
        const connection =  await this.authService.getConnection();
        if(!connection){
            throw new Error("Not connected to Databricks.");
        }
        const selectedCompute = this.computeService.getSelectedCompute();

        if(!selectedCompute){
            throw new Error("No Compute selected.");
        }

        return this.executionService.execute(connection, selectedCompute.id, code, language);
    }
}