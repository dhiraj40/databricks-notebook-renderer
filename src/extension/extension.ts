import * as vscode from "vscode";
import {
  DatabricksCliClient,
  parseCommandExecutionResult,
  parseDatabricksClusters,
} from "./kernel/DatabricksCli";
import { createDatabricksClusterEnvironment } from "./kernel/DatabricksClusterEnvironment";
import { createLocalKernelEnvironment } from "./kernel/LocalKernelEnvironment";
import { KernelService } from "./kernel/KernelService";
import { PythonProcess } from "./kernel/PythonProcess";
import {
  displayKernelLanguage,
  KernelEnvironment,
  normalizeKernelLanguage,
} from "./kernel/KernelEnvironment";
import {
  databricksNotebookSerializer,
  deserializeDatabricksNotebook,
  previewSourceForNotebookData,
  serializeDatabricksNotebook,
} from "./notebookSerializer";

export {
  createLocalKernelEnvironment,
  controllerLabelForLanguage,
  databricksNotebookSerializer,
  DatabricksCliClient,
  deserializeDatabricksNotebook,
  KernelService,
  createDatabricksClusterEnvironment,
  previewSourceForNotebookData,
  parseCommandExecutionResult,
  parseDatabricksClusters,
  serializeDatabricksNotebook,
  PythonProcess,
};

const notebookType = "databricks-notebook-renderer";

const controllerLabelForLanguage = (
  environment: KernelEnvironment,
  languageId?: string,
) => {
  const language = languageId ? normalizeKernelLanguage(languageId) : undefined;

  if (!language || !environment.supportedLanguages.includes(language)) {
    const fallbackLanguage = environment.supportedLanguages[0];
    const fallbackLabel = fallbackLanguage
      ? `${displayKernelLanguage(fallbackLanguage).replace(/^./, (value) =>
          value.toUpperCase(),
        )} Kernel`
      : environment.label;

    return {
      label: environment.label === "Local Auto"
        ? fallbackLabel
        : `${fallbackLabel} (${environment.label})`,
      description: environment.description ?? "Available kernel environment",
    };
  }

  return {
    label: `${
      displayKernelLanguage(language).replace(/^./, (value) =>
        value.toUpperCase(),
      )
    } Kernel${environment.label === "Local Auto" ? "" : ` (${environment.label})`}`,
    description: environment.description ?? "Available kernel environment",
  };
};

type RegisteredController = {
  controller: vscode.NotebookController;
  dispose(): void;
};

const createRegisteredController = (
  context: vscode.ExtensionContext,
  environment: KernelEnvironment,
) => {
  const kernelService = new KernelService(environment);
  const controller = vscode.notebooks.createNotebookController(
    environment.id,
    notebookType,
    environment.label,
  );

  updateControllerPresentation(controller, environment, vscode.window.activeNotebookEditor);
  controller.supportedLanguages = [...environment.supportedLanguages];
  controller.executeHandler = async (cells) => {
    for (const cell of cells) {
      const execution = controller.createNotebookCellExecution(cell);
      execution.start(Date.now());
      await execution.clearOutput();

      try {
        const result = await kernelService.run(
          cell.document.languageId,
          cell.document.getText(),
          { notebookUri: cell.notebook.uri },
        );
        await execution.replaceOutput([
          new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(result),
          ]),
        ]);
        execution.end(true, Date.now());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await execution.replaceOutput([
          new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.stderr(message),
          ]),
        ]);
        execution.end(false, Date.now());
      }
    }
  };

  for (const document of vscode.workspace.notebookDocuments) {
    autoPreferController(controller, document);
  }

  const subscriptions = [
    vscode.workspace.onDidOpenNotebookDocument((document) =>
      autoPreferController(controller, document),
    ),
    vscode.window.onDidChangeActiveNotebookEditor((editor) =>
      updateControllerPresentation(controller, environment, editor),
    ),
    vscode.window.onDidChangeNotebookEditorSelection((event) =>
      updateControllerPresentation(controller, environment, event.notebookEditor),
    ),
  ];

  context.subscriptions.push(controller);
  context.subscriptions.push({ dispose: () => kernelService.dispose() });
  context.subscriptions.push(...subscriptions);

  return {
    controller,
    dispose: () => {
      for (const subscription of subscriptions) {
        subscription.dispose();
      }

      kernelService.dispose();
      controller.dispose();
    },
  } satisfies RegisteredController;
};

class KernelControllerRegistry {
  private registered: RegisteredController[] = [];

  replace(controllers: RegisteredController[]) {
    for (const registeredController of this.registered) {
      registeredController.dispose();
    }

    this.registered = controllers;
  }

  dispose() {
    this.replace([]);
  }
}

const notebookDataFromDocument = (document: vscode.NotebookDocument) => {
  return new vscode.NotebookData(
    document.getCells().map((cell) => {
      const notebookCell = new vscode.NotebookCellData(
        cell.kind,
        cell.document.getText(),
        cell.document.languageId,
      );
      notebookCell.metadata = cell.metadata;
      return notebookCell;
    }),
  );
};

const openPythonSourcePreview = async (editor?: vscode.NotebookEditor) => {
  const activeEditor = editor ?? vscode.window.activeNotebookEditor;

  if (!activeEditor || activeEditor.notebook.notebookType !== notebookType) {
    throw new Error("Open a Databricks notebook to preview its Python source.");
  }

  const source = previewSourceForNotebookData(
    notebookDataFromDocument(activeEditor.notebook),
  );
  const preview = await vscode.workspace.openTextDocument({
    content: source,
    language: "python",
  });

  await vscode.window.showTextDocument(preview, {
    preview: true,
    viewColumn: vscode.ViewColumn.Beside,
    preserveFocus: false,
  });
};

const createKernelEnvironments = async () => {
  const environments = [await createLocalKernelEnvironment()].filter(
    (environment): environment is KernelEnvironment => Boolean(environment),
  );
  const databricksClient = new DatabricksCliClient();

  try {
    const clusters = await databricksClient.listClusters();
    environments.push(
      ...clusters.map((cluster) => createDatabricksClusterEnvironment(cluster)),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Databricks cluster discovery skipped: ${message}`);
  }

  return environments;
};

const registerKernelControllers = async (
  context: vscode.ExtensionContext,
  registry: KernelControllerRegistry,
) => {
  const environments = await createKernelEnvironments();
  registry.replace(
    environments.map((environment) =>
      createRegisteredController(context, environment),
    ),
  );
};

const registerCommands = (
  context: vscode.ExtensionContext,
  registry: KernelControllerRegistry,
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "databricksNotebookRenderer.refreshClusters",
      async () => {
        await registerKernelControllers(context, registry);
        void vscode.window.setStatusBarMessage(
          "Databricks notebook kernels refreshed.",
          3000,
        );
      },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "databricksNotebookRenderer.previewPythonSource",
      async (editor?: vscode.NotebookEditor) => {
        await openPythonSourcePreview(editor);
      },
    ),
  );
};
const getFocusedCellLanguage = (
  editor: vscode.NotebookEditor | undefined,
): string | undefined => {
  if (!editor || editor.notebook.notebookType !== notebookType) {
    return undefined;
  }

  const focusedRange = editor.selections[0] ?? editor.selection;
  const focusedCellIndex = focusedRange?.start ?? 0;

  if (
    focusedCellIndex < 0 ||
    focusedCellIndex >= editor.notebook.cellCount
  ) {
    return undefined;
  }

  return editor.notebook.cellAt(focusedCellIndex).document.languageId;
};

const updateControllerPresentation = (
  controller: vscode.NotebookController,
  environment: KernelEnvironment,
  editor: vscode.NotebookEditor | undefined,
) => {
  const presentation = controllerLabelForLanguage(
    environment,
    getFocusedCellLanguage(editor),
  );
  controller.label = presentation.label;
  controller.description = presentation.description;
};

const autoPreferController = (
  controller: vscode.NotebookController,
  document: vscode.NotebookDocument,
) => {
  if (document.notebookType === notebookType) {
    controller.updateNotebookAffinity(
      document,
      vscode.NotebookControllerAffinity.Preferred,
    );
  }
};

export async function activate(context: vscode.ExtensionContext) {
  const registry = new KernelControllerRegistry();
  context.subscriptions.push({ dispose: () => registry.dispose() });
  registerCommands(context, registry);
  await registerKernelControllers(context, registry);

  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      notebookType,
      databricksNotebookSerializer,
      { transientOutputs: false },
    ),
  );
}

export function deactivate() {}
