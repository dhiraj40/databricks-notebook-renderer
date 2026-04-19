import * as style from './style.css';
import type { RendererContext } from 'vscode-notebook-renderer';

interface IRenderInfo {
  container: HTMLElement;
  mime: string;
  value: unknown;
  context: RendererContext<unknown>;
}

type StatusTone = 'info' | 'success' | 'warning' | 'error';

type MetricItem = {
  label: string;
  value: string;
};

type TableData = {
  columns: string[];
  rows: string[][];
};

type OutputModel = {
  title: string;
  subtitle?: string;
  status: StatusTone;
  summary?: string;
  textBlocks: string[];
  metrics: MetricItem[];
  logs: string[];
  table?: TableData;
  raw?: unknown;
};

type RendererPayload = {
  title?: string;
  subtitle?: string;
  status?: StatusTone;
  summary?: string;
  text?: string | string[];
  metrics?: Array<{ label?: string; value?: unknown }>;
  logs?: string | string[];
  table?: { columns?: unknown; rows?: unknown };
};

const statusClassNames: Record<StatusTone, string> = {
  info: style.statusInfo,
  success: style.statusSuccess,
  warning: style.statusWarning,
  error: style.statusError,
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  classNames?: Array<string | undefined>,
  textContent?: string,
) => {
  const element = document.createElement(tagName);

  for (const className of classNames ?? []) {
    if (className) {
      element.classList.add(className);
    }
  }

  if (textContent !== undefined) {
    element.textContent = textContent;
  }

  return element;
};

const toDisplayString = (value: unknown) => {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
};

const parseIncomingValue = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRendererPayload = (value: unknown): value is RendererPayload =>
  isRecord(value) && ['title', 'subtitle', 'status', 'summary', 'text', 'metrics', 'logs', 'table'].some(key => key in value);

const isPrimitive = (value: unknown) =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);

const normalizeTextBlocks = (value: string | string[] | undefined) => {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const normalizeMetrics = (value: RendererPayload['metrics']) => {
  if (!value) {
    return [];
  }

  return value
    .filter(metric => metric?.label && metric.value !== undefined)
    .map(metric => ({
      label: String(metric.label),
      value: toDisplayString(metric.value),
    }));
};

const normalizeLogs = (value: string | string[] | undefined) => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const isTableShape = (value: unknown): value is { columns: unknown; rows: unknown } =>
  isRecord(value) && 'columns' in value && 'rows' in value;

const toTableData = (value: unknown): TableData | undefined => {
  if (Array.isArray(value) && value.length > 0 && value.every(isRecord)) {
    const columns = Array.from(new Set(value.flatMap(row => Object.keys(row))));
    const rows = value.map(row => columns.map(column => toDisplayString(row[column])));
    return { columns, rows };
  }

  if (!isTableShape(value) || !Array.isArray(value.columns) || !Array.isArray(value.rows)) {
    return undefined;
  }

  const columns = value.columns.map(column => toDisplayString(column));
  const rows = value.rows.map(row => Array.isArray(row)
    ? row.map(cell => toDisplayString(cell))
    : [toDisplayString(row)]);

  return { columns, rows };
};

const objectToMetrics = (value: Record<string, unknown>) => {
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > 6 || entries.some(([, entryValue]) => !isPrimitive(entryValue))) {
    return undefined;
  }

  return entries.map(([label, entryValue]) => ({
    label,
    value: toDisplayString(entryValue),
  }));
};

const toOutputModel = (value: unknown, mime: string): OutputModel => {
  const parsedValue = parseIncomingValue(value);

  if (isRendererPayload(parsedValue)) {
    const table = parsedValue.table ? toTableData(parsedValue.table) : undefined;
    const metrics = normalizeMetrics(parsedValue.metrics);

    if (table && metrics.length === 0) {
      metrics.push(
        { label: 'Rows', value: String(table.rows.length) },
        { label: 'Columns', value: String(table.columns.length) },
      );
    }

    return {
      title: parsedValue.title ?? 'Query result',
      subtitle: parsedValue.subtitle,
      status: parsedValue.status ?? 'info',
      summary: parsedValue.summary,
      textBlocks: normalizeTextBlocks(parsedValue.text),
      metrics,
      logs: normalizeLogs(parsedValue.logs),
      table,
      raw: parsedValue,
    };
  }

  const table = toTableData(parsedValue);
  if (table) {
    return {
      title: 'Result set',
      subtitle: 'Structured preview',
      status: 'success',
      summary: 'Tabular output rendered with a Databricks-style result panel.',
      textBlocks: [],
      metrics: [
        { label: 'Rows', value: String(table.rows.length) },
        { label: 'Columns', value: String(table.columns.length) },
      ],
      logs: [],
      table,
      raw: parsedValue,
    };
  }

  if (isRecord(parsedValue)) {
    const metrics = objectToMetrics(parsedValue);
    if (metrics) {
      return {
        title: 'Notebook summary',
        subtitle: mime,
        status: 'info',
        summary: 'Compact key/value output rendered as notebook metrics.',
        textBlocks: [],
        metrics,
        logs: [],
        raw: parsedValue,
      };
    }
  }

  if (typeof parsedValue === 'string') {
    return {
      title: 'Cell output',
      subtitle: mime,
      status: 'info',
      summary: 'Text output from the active notebook cell.',
      textBlocks: [parsedValue],
      metrics: [],
      logs: [],
    };
  }

  return {
    title: 'Raw notebook output',
    subtitle: mime,
    status: 'info',
    summary: 'No specialized renderer matched this payload, so the raw JSON is shown below.',
    textBlocks: [],
    metrics: [],
    logs: [],
    raw: parsedValue,
  };
};

const renderSectionTitle = (label: string) => createElement('div', [style.sectionTitle], label);

const renderHeader = (model: OutputModel) => {
  const header = createElement('header', [style.header]);
  const topRow = createElement('div', [style.topRow]);
  const badge = createElement('span', [style.badge], model.status);
  const titleBlock = createElement('div', [style.titleBlock]);
  const title = createElement('h2', [style.title], model.title);

  titleBlock.append(title);

  if (model.subtitle) {
    titleBlock.append(createElement('div', [style.subtitle], model.subtitle));
  }

  topRow.append(badge, titleBlock);
  header.append(topRow);

  if (model.summary) {
    header.append(createElement('p', [style.summary], model.summary));
  }

  return header;
};

const renderMetrics = (metrics: MetricItem[]) => {
  const section = createElement('section', [style.section]);
  section.append(renderSectionTitle('Metrics'));

  const grid = createElement('div', [style.metricsGrid]);
  for (const metric of metrics) {
    const card = createElement('div', [style.metricCard]);
    card.append(
      createElement('div', [style.metricLabel], metric.label),
      createElement('div', [style.metricValue], metric.value),
    );
    grid.append(card);
  }

  section.append(grid);
  return section;
};

const renderTextBlocks = (textBlocks: string[]) => {
  const section = createElement('section', [style.section]);
  section.append(renderSectionTitle('Narrative'));

  for (const block of textBlocks) {
    section.append(createElement('pre', [style.bodyText], block));
  }

  return section;
};

const renderLogs = (logs: string[]) => {
  const section = createElement('section', [style.section]);
  section.append(renderSectionTitle('Execution log'));
  section.append(createElement('pre', [style.logBlock], logs.join('\n')));
  return section;
};

const renderTable = (table: TableData) => {
  const section = createElement('section', [style.section]);
  section.append(renderSectionTitle('Result preview'));

  const wrapper = createElement('div', [style.tableWrap]);
  const tableElement = createElement('table', [style.table]);
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');

  for (const column of table.columns) {
    headRow.append(createElement('th', [style.tableHeadCell], column));
  }

  head.append(headRow);
  tableElement.append(head);

  const body = document.createElement('tbody');
  for (const row of table.rows) {
    const rowElement = document.createElement('tr');
    for (const cell of row) {
      rowElement.append(createElement('td', [style.tableCell], cell));
    }
    body.append(rowElement);
  }

  tableElement.append(body);
  wrapper.append(tableElement);
  section.append(wrapper);
  return section;
};

const renderRawJson = (raw: unknown) => {
  const section = createElement('section', [style.section]);
  section.append(renderSectionTitle('Raw JSON'));
  section.append(createElement('pre', [style.jsonBlock], JSON.stringify(raw, null, 2)));
  return section;
};

export function render({ container, mime, value }: IRenderInfo) {
  const model = toOutputModel(value, mime);
  const shell = createElement('article', [style.root, style.shell, statusClassNames[model.status]]);
  const content = createElement('div', [style.content]);

  shell.append(renderHeader(model));

  if (model.metrics.length > 0) {
    content.append(renderMetrics(model.metrics));
  }

  if (model.table) {
    content.append(renderTable(model.table));
  }

  if (model.textBlocks.length > 0) {
    content.append(renderTextBlocks(model.textBlocks));
  }

  if (model.logs.length > 0) {
    content.append(renderLogs(model.logs));
  }

  if (model.raw !== undefined && !model.table && model.metrics.length === 0 && model.textBlocks.length === 0) {
    content.append(renderRawJson(model.raw));
  }

  if (content.childElementCount === 0) {
    content.append(createElement('div', [style.emptyState], 'No renderable notebook content was found in this output item.'));
  }

  const footer = createElement('footer', [style.footer]);
  footer.append(createElement('span', [style.mimePill], mime));
  shell.append(content, footer);
  container.append(shell);
}

if (module.hot) {
  module.hot.addDisposeHandler(() => {
    // The renderer is stateless, so there is nothing to tear down.
  });
}
