import * as vscode from 'vscode';

const NOTEBOOK_HEADER = '# Databricks notebook source';
const COMMAND_DELIMITER = '# COMMAND ----------';
const DBTITLE_PATTERN = /^# DBTITLE \d+,(.*)$/;
const MAGIC_PREFIX = '# MAGIC ';
const EMPTY_MAGIC_LINE = '# MAGIC';

type DatabricksCellMetadata = {
  title?: string;
  magic?: string;
};

type ParsedCell = {
  kind: vscode.NotebookCellKind;
  value: string;
  languageId: string;
  metadata?: DatabricksCellMetadata;
};

const normalizeNewlines = (value: string) => value.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

const trimCellBlock = (value: string) => value.replace(/^\n+/, '').replace(/\n+$/, '');

const splitLines = (value: string) => value === '' ? [] : value.split('\n');

const isMagicLine = (line: string) => line === EMPTY_MAGIC_LINE || line.startsWith(MAGIC_PREFIX);

const stripMagicPrefix = (line: string) => {
  if (line === EMPTY_MAGIC_LINE) {
    return '';
  }

  return line.startsWith(MAGIC_PREFIX) ? line.slice(MAGIC_PREFIX.length) : line;
};

const splitMagicCommand = (value: string) => {
  const lines = splitLines(value);
  const firstLine = lines[0] ?? '';
  const match = firstLine.match(/^%([A-Za-z]+)(?:\s+(.*))?$/);

  if (!match) {
    return undefined;
  }

  const [, rawMagic, inlineBody] = match;
  const bodyLines = lines.slice(1);

  if (inlineBody) {
    bodyLines.unshift(inlineBody);
  }

  return {
    magic: rawMagic.toLowerCase(),
    body: bodyLines.join('\n'),
  };
};

const metadataForCell = (metadata?: DatabricksCellMetadata): { databricks?: DatabricksCellMetadata } => {
  if (!metadata?.title && !metadata?.magic) {
    return {};
  }

  return { databricks: metadata };
};

const getDatabricksMetadata = (cell: vscode.NotebookCellData): DatabricksCellMetadata => {
  const metadata = cell.metadata as { databricks?: DatabricksCellMetadata } | undefined;
  return metadata?.databricks ?? {};
};

const parseDatabricksSource = (value: string): ParsedCell => {
  const normalized = trimCellBlock(normalizeNewlines(value));

  if (!normalized) {
    return {
      kind: vscode.NotebookCellKind.Code,
      value: '',
      languageId: 'python',
    };
  }

  const magicCommand = splitMagicCommand(normalized);

  if (!magicCommand) {
    return {
      kind: vscode.NotebookCellKind.Code,
      value: normalized,
      languageId: 'python',
    };
  }

  switch (magicCommand.magic) {
  case 'md':
    return {
      kind: vscode.NotebookCellKind.Markup,
      value: magicCommand.body,
      languageId: 'markdown',
      metadata: { magic: 'md' },
    };
  case 'sql':
    return {
      kind: vscode.NotebookCellKind.Code,
      value: magicCommand.body,
      languageId: 'sql',
      metadata: { magic: 'sql' },
    };
  case 'scala':
    return {
      kind: vscode.NotebookCellKind.Code,
      value: magicCommand.body,
      languageId: 'scala',
      metadata: { magic: 'scala' },
    };
  case 'python':
    return {
      kind: vscode.NotebookCellKind.Code,
      value: magicCommand.body,
      languageId: 'python',
      metadata: { magic: 'python' },
    };
  case 'r':
    return {
      kind: vscode.NotebookCellKind.Code,
      value: magicCommand.body,
      languageId: 'r',
      metadata: { magic: 'r' },
    };
  case 'sh':
  case 'shell':
    return {
      kind: vscode.NotebookCellKind.Code,
      value: magicCommand.body,
      languageId: 'shellscript',
      metadata: { magic: magicCommand.magic },
    };
  default:
    return {
      kind: vscode.NotebookCellKind.Code,
      value: normalized,
      languageId: 'python',
    };
  }
};

const parseCellBlock = (block: string): vscode.NotebookCellData | undefined => {
  const normalized = trimCellBlock(block);

  if (!normalized) {
    return undefined;
  }

  let lines = splitLines(normalized);
  let metadata: DatabricksCellMetadata | undefined;

  const titleMatch = lines[0]?.match(DBTITLE_PATTERN);
  if (titleMatch) {
    metadata = { ...(metadata ?? {}), title: titleMatch[1].trim() };
    lines = lines.slice(1);
    while (lines[0] === '') {
      lines = lines.slice(1);
    }
  }

  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  const source = nonEmptyLines.length > 0 && nonEmptyLines.every(isMagicLine)
    ? lines.map(stripMagicPrefix).join('\n')
    : lines.join('\n');

  const parsedCell = parseDatabricksSource(source);
  const cell = new vscode.NotebookCellData(parsedCell.kind, parsedCell.value, parsedCell.languageId);
  cell.metadata = metadataForCell({
    ...metadata,
    ...parsedCell.metadata,
  });

  return cell;
};

const toDatabricksMagic = (languageId: string, metadataMagic?: string) => {
  switch (languageId.toLowerCase()) {
  case 'sql':
    return 'sql';
  case 'scala':
    return 'scala';
  case 'r':
    return 'r';
  case 'bash':
  case 'shell':
  case 'shellscript':
    return metadataMagic === 'shell' ? 'shell' : 'sh';
  case 'python':
    return metadataMagic === 'python' ? 'python' : undefined;
  default:
    return undefined;
  }
};

const splitSourceLines = (value: string) => {
  const normalized = normalizeNewlines(value).replace(/\n+$/, '');
  return normalized === '' ? [] : normalized.split('\n');
};

const startsWithMagicCommand = (value: string) => {
  const firstLine = splitSourceLines(value).find(line => line.trim().length > 0);
  return firstLine?.trimStart().startsWith('%') ?? false;
};

const toMagicLines = (lines: string[]) => lines.map(line => line === '' ? EMPTY_MAGIC_LINE : `${MAGIC_PREFIX}${line}`);

const serializeMarkupCell = (value: string) => {
  const lines = splitSourceLines(value);
  return toMagicLines(['%md', ...lines]);
};

const serializeCodeCell = (cell: vscode.NotebookCellData) => {
  const metadata = getDatabricksMetadata(cell);
  const sourceLines = splitSourceLines(cell.value);
  const languageMagic = toDatabricksMagic(cell.languageId, metadata.magic);

  if (languageMagic && (cell.languageId.toLowerCase() !== 'python' || metadata.magic === 'python')) {
    return toMagicLines([`%${languageMagic}`, ...sourceLines]);
  }

  if (startsWithMagicCommand(cell.value)) {
    return toMagicLines(sourceLines);
  }

  return sourceLines;
};

const serializeCell = (cell: vscode.NotebookCellData) => {
  const metadata = getDatabricksMetadata(cell);
  const lines = [COMMAND_DELIMITER];

  if (metadata.title) {
    lines.push(`# DBTITLE 1,${metadata.title}`);
  }

  const bodyLines = cell.kind === vscode.NotebookCellKind.Markup
    ? serializeMarkupCell(cell.value)
    : serializeCodeCell(cell);

  return [...lines, ...bodyLines].join('\n');
};

export const deserializeDatabricksNotebook = (content: Uint8Array): vscode.NotebookData => {
  const text = normalizeNewlines(new TextDecoder().decode(content));
  const lines = splitLines(text);
  const withoutHeader = lines[0]?.trim() === NOTEBOOK_HEADER ? lines.slice(1).join('\n') : text;

  const cells = withoutHeader
    .split(/^# COMMAND ----------.*$/gm)
    .map(parseCellBlock)
    .filter((cell): cell is vscode.NotebookCellData => Boolean(cell));

  return new vscode.NotebookData(cells);
};

export const serializeDatabricksNotebook = (data: vscode.NotebookData): Uint8Array => {
  const body = data.cells.map(serializeCell).join('\n\n');
  const contents = body.length > 0
    ? `${NOTEBOOK_HEADER}\n\n${body}\n`
    : `${NOTEBOOK_HEADER}\n`;

  return new TextEncoder().encode(contents);
};

export const databricksNotebookSerializer: vscode.NotebookSerializer = {
  deserializeNotebook: deserializeDatabricksNotebook,
  serializeNotebook: serializeDatabricksNotebook,
};
