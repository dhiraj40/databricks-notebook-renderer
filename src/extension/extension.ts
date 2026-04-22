import * as vscode from "vscode";
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
  serializeDatabricksNotebook,
} from "./notebookSerializer";

export {
  createLocalKernelEnvironment,
  controllerLabelForLanguage,
  databricksNotebookSerializer,
  deserializeDatabricksNotebook,
  KernelService,
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
    return {
      label: fallbackLanguage
        ? `${displayKernelLanguage(fallbackLanguage).replace(/^./, (value) =>
            value.toUpperCase(),
          )} Kernel`
        : environment.label,
      description: "Auto-selected available kernel environment",
    };
  }

  return {
    label: `${displayKernelLanguage(language).replace(/^./, (value) =>
      value.toUpperCase(),
    )} Kernel`,
    description: "Auto-selected available kernel environment",
  };
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

const registerKernelController = (
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

  context.subscriptions.push(
    vscode.workspace.onDidOpenNotebookDocument((document) =>
      autoPreferController(controller, document),
    ),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveNotebookEditor((editor) =>
      updateControllerPresentation(controller, environment, editor),
    ),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeNotebookEditorSelection((event) =>
      updateControllerPresentation(controller, environment, event.notebookEditor),
    ),
  );
  context.subscriptions.push({ dispose: () => kernelService.dispose() });
  context.subscriptions.push(controller);
};

const registerKernelControllers = async (context: vscode.ExtensionContext) => {
  // New environments, including Databricks clusters later, can be appended here
  // without changing notebook execution flow.
  const environments = [await createLocalKernelEnvironment()].filter(
    (environment): environment is KernelEnvironment => Boolean(environment),
  );

  for (const environment of environments) {
    registerKernelController(context, environment);
  }
};

export async function activate(context: vscode.ExtensionContext) {
  await registerKernelControllers(context);

  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      notebookType,
      databricksNotebookSerializer,
      { transientOutputs: false },
    ),
  );
}

export function deactivate() {}
