// src/kernel/KernelService.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExecutionQueue } from './ExecutionQueue';
import {
  displayKernelLanguage,
  KernelEnvironment,
  KernelLanguage,
  normalizeKernelLanguage,
} from './KernelEnvironment';
import { deserializeDatabricksNotebook } from '../notebookSerializer';

type KernelRunOptions = {
  notebookUri?: vscode.Uri;
};

const DATABRICKS_NOTEBOOK_HEADER = '# Databricks notebook source';
const RUN_MAGIC_PATTERN = /^\s*%run\s+(.+?)\s*$/gm;

export class KernelService {
  private readonly queue = new ExecutionQueue();

  constructor(private readonly environment: KernelEnvironment) {}

  run(languageId: string, code: string, options?: KernelRunOptions): Promise<string> {
    const language = normalizeKernelLanguage(languageId);

    if (!language) {
      throw new Error(`Unsupported Databricks cell language: ${languageId}.`);
    }

    return this.queue.enqueue(async () => {
      const preparedCode = await this.prepareCode(language, code, options?.notebookUri);
      return this.environment.execute(language, preparedCode);
    });
  }

  dispose() {
    this.environment.dispose();
  }

  private async prepareCode(
    language: KernelLanguage,
    code: string,
    notebookUri?: vscode.Uri,
  ): Promise<string> {
    if (
      this.environment.executionKind !== 'local' ||
      language !== 'python' ||
      !notebookUri
    ) {
      return code;
    }

    return this.expandRunCommands(code, notebookUri, new Set<string>());
  }

  private async expandRunCommands(
    source: string,
    notebookUri: vscode.Uri,
    stack: Set<string>,
  ): Promise<string> {
    const matches = [...source.matchAll(RUN_MAGIC_PATTERN)];
    if (matches.length === 0) {
      return source;
    }

    let expanded = '';
    let lastIndex = 0;

    for (const match of matches) {
      const [fullMatch, rawTarget] = match;
      const matchIndex = match.index ?? 0;

      expanded += source.slice(lastIndex, matchIndex);
      expanded += await this.inlineRunTarget(notebookUri, rawTarget.trim(), stack);
      lastIndex = matchIndex + fullMatch.length;
    }

    expanded += source.slice(lastIndex);
    return expanded;
  }

  private async inlineRunTarget(
    notebookUri: vscode.Uri,
    rawTarget: string,
    stack: Set<string>,
  ): Promise<string> {
    const targetUri = await this.resolveRunTarget(notebookUri, rawTarget);
    const targetKey = targetUri.toString();

    if (stack.has(targetKey)) {
      throw new Error(`Circular %run detected while loading ${rawTarget}.`);
    }

    stack.add(targetKey);

    try {
      const targetSource = await this.loadRunnablePythonSource(targetUri, stack);
      return [
        `# %run ${rawTarget}`,
        targetSource,
        `# end %run ${rawTarget}`,
      ].join('\n');
    } finally {
      stack.delete(targetKey);
    }
  }

  private async resolveRunTarget(notebookUri: vscode.Uri, rawTarget: string): Promise<vscode.Uri> {
    if (notebookUri.scheme !== 'file') {
      throw new Error('%run is currently supported only for local file-backed notebooks.');
    }

    const notebookDirectory = path.dirname(notebookUri.fsPath);
    const candidateBasePath = path.resolve(notebookDirectory, rawTarget);
    const candidates = path.extname(candidateBasePath)
      ? [candidateBasePath]
      : [candidateBasePath, `${candidateBasePath}.py`];

    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return vscode.Uri.file(candidate);
      } catch {
        // Try the next candidate.
      }
    }

    throw new Error(`Unable to resolve %run target "${rawTarget}" from ${path.basename(notebookUri.fsPath)}.`);
  }

  private async loadRunnablePythonSource(targetUri: vscode.Uri, stack: Set<string>): Promise<string> {
    const text = await fs.readFile(targetUri.fsPath, 'utf8');

    if (!text.replace(/^\uFEFF/, '').trimStart().startsWith(DATABRICKS_NOTEBOOK_HEADER)) {
      return this.expandRunCommands(text, targetUri, stack);
    }

    const notebook = deserializeDatabricksNotebook(new TextEncoder().encode(text));
    const runnableCells: string[] = [];

    for (const cell of notebook.cells) {
      if (cell.kind !== vscode.NotebookCellKind.Code) {
        continue;
      }

      if (cell.languageId !== 'python') {
        const unsupportedLanguage = normalizeKernelLanguage(cell.languageId);
        throw new Error(
          `%run target "${path.basename(targetUri.fsPath)}" contains ${
            unsupportedLanguage ? displayKernelLanguage(unsupportedLanguage) : cell.languageId
          } cells, which local Python %run does not support yet.`,
        );
      }

      runnableCells.push(await this.expandRunCommands(cell.value, targetUri, stack));
    }

    return runnableCells.join('\n\n');
  }
}
