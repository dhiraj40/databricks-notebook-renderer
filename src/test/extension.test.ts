import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

import * as vscode from 'vscode';

// Load the built extension bundle so tests exercise the same code shipped to VS Code.
const extensionBundle = require('../../out/extension/extension.js') as {
  controllerLabelForLanguage: (
    environment: { label: string; supportedLanguages: readonly ('python' | 'sql' | 'shellscript' | 'scala')[] },
    languageId?: string,
  ) => { label: string; description: string };
  createLocalKernelEnvironment: () => Promise<{
    supportedLanguages: readonly string[];
    execute: (language: 'python' | 'sql' | 'shellscript' | 'scala', code: string) => Promise<string>;
    dispose: () => void;
  } | undefined>;
  KernelService: new (environment: {
    execute: (language: 'python' | 'sql' | 'shellscript' | 'scala', code: string) => Promise<string>;
    dispose: () => void;
  }) => {
    dispose: () => void;
    run: (languageId: string, code: string, options?: { notebookUri?: vscode.Uri }) => Promise<string>;
  };
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
});
