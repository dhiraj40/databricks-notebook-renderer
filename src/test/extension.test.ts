import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

import * as vscode from 'vscode';

// Load the built extension bundle so tests exercise the same code shipped to VS Code.
const extensionBundle = require('../../out/extension/extension.js') as {
  controllerLabelForLanguage: (
    environment: {
      label: string;
      description?: string;
      supportedLanguages: readonly ('python' | 'sql' | 'shellscript' | 'scala')[];
    },
    languageId?: string,
  ) => { label: string; description: string };
  createDatabricksClusterEnvironment: (cluster: {
    id: string;
    name: string;
    state?: string;
  }, client?: {
    createCommandContext: (clusterId: string, language: string) => Promise<{ id: string }>;
    destroyCommandContext: (clusterId: string, contextId: string) => Promise<void>;
    ensureClusterRunning: (clusterId: string, clusterState?: string) => Promise<void>;
    executeCommand: (clusterId: string, contextId: string, language: string, code: string) => Promise<{ id: string }>;
    waitForCommand: (clusterId: string, contextId: string, commandId: string) => Promise<string>;
  }) => {
    id: string;
    label: string;
    description: string;
    supportedLanguages: readonly string[];
    execute: (language: 'python' | 'sql' | 'shellscript' | 'scala', code: string) => Promise<string>;
    dispose: () => void;
  };
  createLocalKernelEnvironment: () => Promise<{
    supportedLanguages: readonly string[];
    execute: (language: 'python' | 'sql' | 'shellscript' | 'scala', code: string) => Promise<string>;
    dispose: () => void;
  } | undefined>;
  DatabricksCliClient: new (...args: unknown[]) => {
    listClusters: () => Promise<Array<{ id: string; name: string; state?: string }>>;
  };
  parseCommandExecutionResult: (response: unknown) => string;
  previewSourceForNotebookData: (data: vscode.NotebookData) => string;
  KernelService: new (environment: {
    executionKind?: 'local' | 'databricks';
    execute: (language: 'python' | 'sql' | 'shellscript' | 'scala', code: string) => Promise<string>;
    dispose: () => void;
  }) => {
    dispose: () => void;
    run: (languageId: string, code: string, options?: { notebookUri?: vscode.Uri }) => Promise<string>;
  };
  parseDatabricksClusters: (raw: string) => Array<{ id: string; name: string; state?: string }>;
  deserializeDatabricksNotebook: (content: Uint8Array) => vscode.NotebookData;
  serializeDatabricksNotebook: (data: vscode.NotebookData) => Uint8Array;
  PythonProcess: new () => {
    dispose: () => void;
    execute: (code: string) => Promise<string>;
  };
};

const hasPython = spawnSync('python', ['--version'], { encoding: 'utf8' }).status === 0;

suite('Extension Test Suite', () => {
  test('deserializes Databricks markdown, SQL, and magic cells', () => {
    const source = [
      '# Databricks notebook source',
      '',
      '# COMMAND ----------',
      '# DBTITLE 1,Overview',
      '# MAGIC %md',
      '# MAGIC # Revenue overview',
      '# MAGIC This notebook summarises revenue by region.',
      '',
      '# COMMAND ----------',
      '# MAGIC %sql',
      '# MAGIC select * from revenue_by_region',
      '',
      '# COMMAND ----------',
      '# MAGIC %run ../shared/setup',
      '',
      '# COMMAND ----------',
      'print("ready")',
    ].join('\n');

    const notebook = extensionBundle.deserializeDatabricksNotebook(new TextEncoder().encode(source));

    assert.strictEqual(notebook.cells.length, 4);
    assert.strictEqual(notebook.cells[0].kind, vscode.NotebookCellKind.Markup);
    assert.strictEqual(notebook.cells[0].languageId, 'markdown');
    assert.strictEqual(notebook.cells[0].value, '# Revenue overview\nThis notebook summarises revenue by region.');
    assert.deepStrictEqual((notebook.cells[0].metadata as { databricks?: unknown }).databricks, {
      title: 'Overview',
      magic: 'md',
    });

    assert.strictEqual(notebook.cells[1].languageId, 'sql');
    assert.strictEqual(notebook.cells[1].value, 'select * from revenue_by_region');

    assert.strictEqual(notebook.cells[2].languageId, 'python');
    assert.strictEqual(notebook.cells[2].value, '%run ../shared/setup');

    assert.strictEqual(notebook.cells[3].languageId, 'python');
    assert.strictEqual(notebook.cells[3].value, 'print("ready")');
  });

  test('serializes notebook cells back to Databricks source format', () => {
    const markdownCell = new vscode.NotebookCellData(
      vscode.NotebookCellKind.Markup,
      '# Databricks notebook\nRendered inside VS Code.',
      'markdown'
    );
    markdownCell.metadata = { databricks: { title: 'Intro' } };

    const sqlCell = new vscode.NotebookCellData(
      vscode.NotebookCellKind.Code,
      'select current_date() as run_date',
      'sql'
    );

    const pythonCell = new vscode.NotebookCellData(
      vscode.NotebookCellKind.Code,
      '%run ../shared/setup',
      'python'
    );

    const notebook = new vscode.NotebookData([markdownCell, sqlCell, pythonCell]);
    const serialized = new TextDecoder().decode(extensionBundle.serializeDatabricksNotebook(notebook));

    assert.ok(serialized.startsWith('# Databricks notebook source'));
    assert.ok(serialized.includes('# DBTITLE 1,Intro'));
    assert.ok(serialized.includes('# MAGIC %md'));
    assert.ok(serialized.includes('# MAGIC %sql'));
    assert.ok(serialized.includes('# MAGIC %run ../shared/setup'));
    assert.ok(serialized.includes('select current_date() as run_date'));
  });

  test('creates a text preview from notebook data', () => {
    const notebook = new vscode.NotebookData([
      new vscode.NotebookCellData(
        vscode.NotebookCellKind.Code,
        'print("preview")',
        'python',
      ),
    ]);

    const preview = extensionBundle.previewSourceForNotebookData(notebook);

    assert.ok(preview.startsWith('# Databricks notebook source'));
    assert.ok(preview.includes('print("preview")'));
  });

  test('returns stable output when the same cell is executed repeatedly', async function () {
    if (!hasPython) {
      this.skip();
      return;
    }

    const process = new extensionBundle.PythonProcess();

    try {
      const first = await process.execute('print("stable output")');
      const second = await process.execute('print("stable output")');

      assert.strictEqual(first, 'stable output');
      assert.strictEqual(second, 'stable output');
    } finally {
      process.dispose();
    }
  });

  test('captures multiline cell output without leaking REPL prompts', async function () {
    if (!hasPython) {
      this.skip();
      return;
    }

    const process = new extensionBundle.PythonProcess();

    try {
      const result = await process.execute([
        'for value in range(2):',
        '    print(f"row {value}")',
      ].join('\n'));

      assert.strictEqual(result, 'row 0\nrow 1');
    } finally {
      process.dispose();
    }
  });

  test('discovers a local kernel environment and auto-enables available runtimes', async () => {
    const environment = await extensionBundle.createLocalKernelEnvironment();

    assert.ok(environment);
    assert.ok((environment?.supportedLanguages.length ?? 0) > 0);

    if (hasPython) {
      assert.ok(environment?.supportedLanguages.includes('python'));
      assert.ok(environment?.supportedLanguages.includes('sql'));
    }

    environment?.dispose();
  });

  test('executes shell cells through the discovered local environment', async function () {
    const environment = await extensionBundle.createLocalKernelEnvironment();

    if (!environment?.supportedLanguages.includes('shellscript')) {
      this.skip();
      return;
    }

    try {
      const command = process.platform === 'win32'
        ? 'Write-Output "hello shell"'
        : 'printf "hello shell\\n"';
      const result = await environment.execute('shellscript', command);

      assert.strictEqual(result, 'hello shell');
    } finally {
      environment.dispose();
    }
  });

  test('expands notebook-relative %run commands before Python execution', async function () {
    if (!hasPython) {
      this.skip();
      return;
    }

    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'db-notebook-renderer-'));

    try {
      const notebookPath = path.join(tempDirectory, 'main.py');
      const childNotebookPath = path.join(tempDirectory, 'abc.py');

      await fs.writeFile(
        childNotebookPath,
        [
          '# Databricks notebook source',
          '',
          '# COMMAND ----------',
          'value = 7',
          'print(f"loaded {value}")',
          '',
        ].join('\n'),
        'utf8',
      );

      await fs.writeFile(
        notebookPath,
        [
          '# Databricks notebook source',
          '',
          '# COMMAND ----------',
          '# MAGIC %run ./abc',
          '',
        ].join('\n'),
        'utf8',
      );

      const environment = await extensionBundle.createLocalKernelEnvironment();
      if (!environment?.supportedLanguages.includes('python')) {
        this.skip();
        return;
      }

      const kernelService = new extensionBundle.KernelService(environment);

      try {
        const result = await kernelService.run('python', '%run ./abc', {
          notebookUri: vscode.Uri.file(notebookPath),
        });

        assert.strictEqual(result, 'loaded 7');
      } finally {
        kernelService.dispose();
      }
    } finally {
      await fs.rm(tempDirectory, { recursive: true, force: true });
    }
  });

  test('shows the focused cell language as the kernel label', () => {
    const environment = {
      label: 'Local Auto',
      description: 'Auto-selected available kernel environment',
      supportedLanguages: ['python', 'sql', 'shellscript', 'scala'] as const,
    };

    assert.strictEqual(
      extensionBundle.controllerLabelForLanguage(environment, 'python').label,
      'Python Kernel',
    );
    assert.strictEqual(
      extensionBundle.controllerLabelForLanguage(environment, 'scala').label,
      'Scala Kernel',
    );
    assert.strictEqual(
      extensionBundle.controllerLabelForLanguage(environment, 'shellscript').label,
      'Shell Kernel',
    );
  });

  test('includes the cluster name in notebook kernel labels', () => {
    const environment = {
      label: 'Shared Analytics',
      description: 'Databricks cluster Shared Analytics (running).',
      supportedLanguages: ['python', 'sql', 'shellscript', 'scala'] as const,
    };

    const presentation = extensionBundle.controllerLabelForLanguage(environment, 'python');

    assert.strictEqual(presentation.label, 'Python Kernel (Shared Analytics)');
    assert.strictEqual(
      presentation.description,
      'Databricks cluster Shared Analytics (running).',
    );
  });

  test('parses Databricks cluster discovery output', () => {
    const clusters = extensionBundle.parseDatabricksClusters(JSON.stringify({
      clusters: [
        {
          cluster_id: 'abc-123',
          cluster_name: 'Shared Analytics',
          state: 'RUNNING',
        },
        {
          cluster_id: 'def-456',
          cluster_name: 'ETL Jobs',
          state: 'TERMINATED',
        },
      ],
    }));

    assert.deepStrictEqual(clusters, [
      { id: 'abc-123', name: 'Shared Analytics', state: 'RUNNING' },
      { id: 'def-456', name: 'ETL Jobs', state: 'TERMINATED' },
    ]);
  });

  test('creates Databricks cluster environments with all notebook languages', () => {
    const environment = extensionBundle.createDatabricksClusterEnvironment({
      id: 'abc-123',
      name: 'Shared Analytics',
      state: 'RUNNING',
    });

    assert.strictEqual(environment.id, 'databricks-notebook-renderer.cluster.abc-123');
    assert.strictEqual(environment.label, 'Shared Analytics');
    assert.deepStrictEqual(environment.supportedLanguages, [
      'python',
      'sql',
      'shellscript',
      'scala',
    ]);
  });

  test('parses finished Databricks command output', () => {
    const result = extensionBundle.parseCommandExecutionResult({
      status: 'Finished',
      results: {
        resultType: 'text',
        data: 'hello from cluster\n',
      },
    });

    assert.strictEqual(result, 'hello from cluster');
  });

  test('raises Databricks execution errors from command status results', () => {
    assert.throws(
      () => extensionBundle.parseCommandExecutionResult({
        status: 'Error',
        results: {
          cause: 'python traceback',
        },
      }),
      /python traceback/,
    );
  });

  test('executes cells against the selected Databricks cluster environment', async () => {
    const calls: string[] = [];
    const environment = extensionBundle.createDatabricksClusterEnvironment(
      {
        id: 'abc-123',
        name: 'Shared Analytics',
        state: 'TERMINATED',
      },
      {
        async ensureClusterRunning(clusterId: string, clusterState?: string) {
          calls.push(`start:${clusterId}:${clusterState ?? ''}`);
        },
        async createCommandContext(clusterId: string, language: string) {
          calls.push(`context:${clusterId}:${language}`);
          return { id: `${language}-ctx` };
        },
        async executeCommand(clusterId: string, contextId: string, language: string, code: string) {
          calls.push(`execute:${clusterId}:${contextId}:${language}:${code}`);
          return { id: 'cmd-1' };
        },
        async waitForCommand(clusterId: string, contextId: string, commandId: string) {
          calls.push(`wait:${clusterId}:${contextId}:${commandId}`);
          return 'cluster output';
        },
        async destroyCommandContext(clusterId: string, contextId: string) {
          calls.push(`destroy:${clusterId}:${contextId}`);
        },
      },
    );

    try {
      const result = await environment.execute('python', 'print("hello")');

      assert.strictEqual(result, 'cluster output');
      assert.deepStrictEqual(calls.slice(0, 4), [
        'start:abc-123:TERMINATED',
        'context:abc-123:python',
        'execute:abc-123:python-ctx:python:print("hello")',
        'wait:abc-123:python-ctx:cmd-1',
      ]);
    } finally {
      await environment.dispose();
    }

    assert.ok(calls.includes('destroy:abc-123:python-ctx'));
  });

  test('does not expand %run locally when executing on Databricks clusters', async function () {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'db-notebook-renderer-remote-'));

    try {
      const notebookPath = path.join(tempDirectory, 'main.py');
      await fs.writeFile(
        notebookPath,
        [
          '# Databricks notebook source',
          '',
          '# COMMAND ----------',
          '# MAGIC %run ./abc',
          '',
        ].join('\n'),
        'utf8',
      );

      const captured: string[] = [];
      const kernelService = new extensionBundle.KernelService({
        executionKind: 'databricks',
        async execute(_language: 'python' | 'sql' | 'shellscript' | 'scala', code: string) {
          captured.push(code);
          return 'ok';
        },
        dispose() {},
      });

      try {
        await kernelService.run('python', '%run ./abc', {
          notebookUri: vscode.Uri.file(notebookPath),
        });
      } finally {
        kernelService.dispose();
      }

      assert.deepStrictEqual(captured, ['%run ./abc']);
    } finally {
      await fs.rm(tempDirectory, { recursive: true, force: true });
    }
  });
});
