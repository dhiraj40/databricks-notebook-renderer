import * as assert from 'assert';

import * as vscode from 'vscode';

// Load the built extension bundle so tests exercise the same code shipped to VS Code.
const extensionBundle = require('../../out/extension/extension.js') as {
  deserializeDatabricksNotebook: (content: Uint8Array) => vscode.NotebookData;
  serializeDatabricksNotebook: (data: vscode.NotebookData) => Uint8Array;
};

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
});
