import * as vscode from "vscode";
import { ServiceRegistry } from "./core/registry/serviceRegistry";
import { VSCodeSecretStorage } from "./core/storage/secretStorage";
import { AuthService } from "./databricks/auth/authService";
import { CommandRegistry } from "./core/registry/commandRegistry";
import { ExtensionIds } from "./core/configuration/extensionIds";
import { ConnectCommand } from "./features/connection/connectCommand";
import { DisconnectCommand } from "./features/connection/disconnectCommand";
import { SecretKeys } from "./core/configuration/secretKeys";
import { ServiceKeys } from "./core/registry/serviceKeys";
import { AuthApi } from "./databricks/api/authApi";
import { SelectComputeCommand } from "./features/compute-selector/selectComputeCommand";
import { ComputeState } from "./databricks/state/computeState";
import { ComputeApi } from "./databricks/api/computeApi";
import { ComputeService } from "./databricks/services/computeService";
import { NotebookController } from "./notebook/controller/notebookController";
import { CellExecutionService } from "./notebook/execution/cellExecutionService";
import { ExecutionService } from "./databricks/services/executionService";
import { CommandApi } from "./databricks/api/commandApi";
import { SessionService } from "./databricks/services/sessionService";
import { SessionApi } from "./databricks/api/sessionApi";
import { SessionState } from "./databricks/state/sessionState";
import { NotebookSerializer } from "./notebook/serializer/notebookSerializer";
import { DatabricksTreeDataProvider } from "./ui/sidebar/databricksTreeDataProvider";
import { DatabricksView } from "./ui/sidebar/databricksView";
import { EventBus } from "./core/events/eventBus";
import { VSCodeWorkspaceStorage } from "./core/storage/workspaceStorage";


export async function activate(
    context: vscode.ExtensionContext
): Promise<void> {
    // Service Registry
    const serviceRegistry = new ServiceRegistry();

    // Register Event Bus
    const eventBus = new EventBus();
    serviceRegistry.register(ServiceKeys.eventBus, eventBus);
    
    // Register secrete storage service
    const secretStorage = new VSCodeSecretStorage(context.secrets);
    serviceRegistry.register(ServiceKeys.secretStorage, secretStorage);

    // Register auth api
    const authApi = new AuthApi();
    serviceRegistry.register(ServiceKeys.authApi, authApi);

    // Register auth service
    const authService = new AuthService(authApi, secretStorage);
    serviceRegistry.register(ServiceKeys.authService, authService);

    // Command Registry
    const commandRegistry = new CommandRegistry(context);

    // Register Command connect
    const connectCommand = new ConnectCommand(authApi, authService, eventBus);
    commandRegistry.register(
        ExtensionIds.commands.connect, () => connectCommand.execute()
    );

    // Register Command disconnect
    const disconnectCommand = new DisconnectCommand(authService, eventBus );
    commandRegistry.register(
        ExtensionIds.commands.disconnect, () => disconnectCommand.execute()
    );

    // vscode workspace registry
    const vsCodeWorkspaceStorage = new VSCodeWorkspaceStorage(context.workspaceState);
    serviceRegistry.register(ServiceKeys.workspaceStorage, vsCodeWorkspaceStorage);

    // Register Selected Compute Service
    const computeState = new ComputeState();
    const computeApi = new ComputeApi();

    const computeService = new ComputeService(computeApi, computeState, vsCodeWorkspaceStorage);
    const selectedComputeCommand = new SelectComputeCommand(authService, computeService, eventBus);
    commandRegistry.register(ExtensionIds.commands.selectCompute, () => selectedComputeCommand.execute());

    // Restore selected compute
    const connection = await authService.getConnection();
    if(connection){
        await computeService.restoreSelectedCompute(connection);
    }


    // Session Service
    const sessionApi = new SessionApi();
    const sessionState = new SessionState();
    const sessionService = new SessionService(sessionApi, sessionState, eventBus);

    // Tree Provider
    const databricksTreeProvider = new DatabricksTreeDataProvider(authService, computeService, sessionService, eventBus);
    const databricksView = new DatabricksView(databricksTreeProvider);
    context.subscriptions.push(databricksView);

    // Execution Service
    const commandApi = new CommandApi();
    const executionService = new ExecutionService(commandApi, sessionService);

    // Register Notebook Controller
    const cellExecutionService = new CellExecutionService(authService, computeService, executionService);
    const notebookController = new NotebookController(cellExecutionService);
    context.subscriptions.push(notebookController);

    console.log(
        "NotebookController registered"
    );

    // Notebook Serializer
    const notebookSerializer = new NotebookSerializer();

    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer(
            "databricks-notebook-renderer",
            notebookSerializer,
            {
                transientOutputs: true
            }
        )
    );

    console.log("Extension Activated");
}

export function deactivate(): void {
    console.log("Extension Deactivated");
}