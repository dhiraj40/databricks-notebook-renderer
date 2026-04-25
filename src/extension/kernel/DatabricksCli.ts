import { spawn } from 'child_process';
import * as vscode from 'vscode';
import { KernelLanguage } from './KernelEnvironment';

export type DatabricksClusterSummary = {
  id: string;
  name: string;
  state?: string;
};

export type CommandRunner = (
  command: string,
  args: readonly string[],
) => Promise<string>;

const runCommand: CommandRunner = (command, args) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, [...args], {
      stdio: 'pipe',
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    process.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    process.once('error', (error) => reject(error));
    process.once('exit', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || `Command "${command}" exited with code ${code ?? 'unknown'}.`));
    });
  });
};

const asArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

export const parseDatabricksClusters = (raw: string): DatabricksClusterSummary[] => {
  const parsed = JSON.parse(raw) as {
    clusters?: unknown;
  } | unknown[];

  const items = Array.isArray(parsed)
    ? parsed
    : asArray((parsed as { clusters?: unknown }).clusters);

  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const cluster = item as {
      cluster_id?: unknown;
      cluster_name?: unknown;
      state?: unknown;
    };
    const id = typeof cluster.cluster_id === 'string' ? cluster.cluster_id : undefined;
    const name = typeof cluster.cluster_name === 'string' ? cluster.cluster_name : undefined;
    const state = typeof cluster.state === 'string' ? cluster.state : undefined;

    if (!id || !name) {
      return [];
    }

    return [{
      id,
      name,
      state,
    }];
  });
};

const parseJson = <T>(raw: string): T => {
  if (!raw.trim()) {
    return {} as T;
  }

  return JSON.parse(raw) as T;
};

type DatabricksCommandStatus = 'Cancelled' | 'Cancelling' | 'Error' | 'Finished' | 'Queued' | 'Running';

type DatabricksCommandResults = {
  cause?: string;
  data?: unknown;
  resultType?: string;
  result_type?: string;
  summary?: string;
};

type DatabricksCommandStatusResponse = {
  results?: DatabricksCommandResults;
  status?: DatabricksCommandStatus | string;
};

export type DatabricksClusterDetails = DatabricksClusterSummary & {
  sparkVersion?: string;
};

export type DatabricksCommandContext = {
  id: string;
};

export type DatabricksCommandHandle = {
  id: string;
};

const commandLanguageForKernelLanguage = (language: KernelLanguage) => {
  switch (language) {
  case 'shellscript':
    return 'python';
  default:
    return language;
  }
};

const wrapRemoteCode = (language: KernelLanguage, code: string) => {
  if (language !== 'shellscript') {
    return code;
  }

  const encoded = Buffer.from(code, 'utf8').toString('base64');
  return [
    'import base64, subprocess, sys',
    `__vscode_shell = base64.b64decode(${JSON.stringify(encoded)}).decode('utf-8')`,
    "result = subprocess.run(['bash', '-lc', __vscode_shell], capture_output=True, text=True)",
    'if result.stdout:',
    "    print(result.stdout, end='')",
    'if result.returncode != 0:',
    "    raise RuntimeError(result.stderr.strip() or f'Shell command failed with exit code {result.returncode}.')",
    'if result.stderr:',
    "    print(result.stderr, file=sys.stderr, end='')",
  ].join('\n');
};

const formatExecutionData = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trimEnd();
  }

  if (Array.isArray(value)) {
    const rows = value.map((item) => {
      if (Array.isArray(item)) {
        return item.map((cell) => String(cell ?? '')).join(' | ');
      }

      if (item && typeof item === 'object') {
        return Object.values(item as Record<string, unknown>).map((cell) => String(cell ?? '')).join(' | ');
      }

      return String(item ?? '');
    });

    return rows.join('\n').trimEnd();
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value ?? '').trimEnd();
};

export const parseCommandExecutionResult = (response: DatabricksCommandStatusResponse): string => {
  const status = response.status;
  const results = response.results;
  const resultType = results?.resultType ?? results?.result_type;

  if (status === 'Error') {
    throw new Error(results?.cause ?? results?.summary ?? 'Databricks command execution failed.');
  }

  if (status === 'Cancelled' || status === 'Cancelling') {
    throw new Error('Databricks command execution was cancelled.');
  }

  if (status !== 'Finished') {
    throw new Error(`Databricks command execution is not finished yet (status: ${status ?? 'unknown'}).`);
  }

  if (resultType === 'error') {
    throw new Error(results?.cause ?? results?.summary ?? 'Databricks command execution failed.');
  }

  return formatExecutionData(results?.data);
};

export class DatabricksCliClient {
  constructor(
    private readonly configuration = vscode.workspace.getConfiguration('databricksNotebookRenderer'),
    private readonly commandRunner: CommandRunner = runCommand,
  ) {}

  private get command() {
    return this.configuration.get<string>('databricksCliPath', 'databricks').trim() || 'databricks';
  }

  private get profile() {
    return this.configuration.get<string>('databricksProfile', '').trim();
  }

  private get commandTimeoutSeconds() {
    return this.configuration.get<number>('databricksCommandTimeoutSeconds', 120);
  }

  private buildArgs(args: readonly string[]) {
    if (!this.profile) {
      return [...args];
    }

    return [...args, '--profile', this.profile];
  }

  private async runJsonCommand<T>(args: readonly string[]) {
    const output = await this.commandRunner(this.command, this.buildArgs(args));
    return parseJson<T>(output);
  }

  async listClusters(): Promise<DatabricksClusterSummary[]> {
    const output = await this.commandRunner(
      this.command,
      this.buildArgs(['clusters', 'list', '--output', 'json']),
    );
    return parseDatabricksClusters(output);
  }

  async getCluster(clusterId: string): Promise<DatabricksClusterDetails> {
    const response = await this.runJsonCommand<{
      cluster_id?: string;
      cluster_name?: string;
      spark_version?: string;
      state?: string;
    }>(['clusters', 'get', clusterId, '--output', 'json']);

    return {
      id: response.cluster_id ?? clusterId,
      name: response.cluster_name ?? clusterId,
      sparkVersion: response.spark_version,
      state: response.state,
    };
  }

  async ensureClusterRunning(clusterId: string, clusterState?: string): Promise<void> {
    if (!clusterState || clusterState === 'TERMINATED') {
      await this.commandRunner(
        this.command,
        this.buildArgs(['clusters', 'start', clusterId]),
      );
    }
  }

  async createCommandContext(clusterId: string, language: KernelLanguage): Promise<DatabricksCommandContext> {
    const response = await this.runJsonCommand<{ id?: string | number }>([
      'api',
      'post',
      '/api/1.2/contexts/create',
      '--json',
      JSON.stringify({
        clusterId: clusterId,
        language: commandLanguageForKernelLanguage(language),
      }),
    ]);

    if (response.id === undefined || response.id === null) {
      throw new Error(`Databricks did not return a command context id for cluster ${clusterId}.`);
    }

    return {
      id: String(response.id),
    };
  }

  async destroyCommandContext(clusterId: string, contextId: string): Promise<void> {
    await this.runJsonCommand([
      'api',
      'post',
      '/api/1.2/contexts/destroy',
      '--json',
      JSON.stringify({
        clusterId,
        contextId,
      }),
    ]);
  }

  async executeCommand(
    clusterId: string,
    contextId: string,
    language: KernelLanguage,
    code: string,
  ): Promise<DatabricksCommandHandle> {
    const response = await this.runJsonCommand<{ id?: string | number }>([
      'api',
      'post',
      '/api/1.2/commands/execute',
      '--json',
      JSON.stringify({
        clusterId,
        contextId,
        language: commandLanguageForKernelLanguage(language),
        command: wrapRemoteCode(language, code),
      }),
    ]);

    if (response.id === undefined || response.id === null) {
      throw new Error(`Databricks did not return a command id for cluster ${clusterId}.`);
    }

    return {
      id: String(response.id),
    };
  }

  async getCommandStatus(
    clusterId: string,
    contextId: string,
    commandId: string,
  ): Promise<DatabricksCommandStatusResponse> {
    return this.runJsonCommand<DatabricksCommandStatusResponse>([
      'api',
      'post',
      '/api/1.2/commands/status',
      '--json',
      JSON.stringify({
        clusterId,
        contextId,
        commandId,
      }),
    ]);
  }

  async waitForCommand(
    clusterId: string,
    contextId: string,
    commandId: string,
  ): Promise<string> {
    const timeoutAt = Date.now() + this.commandTimeoutSeconds * 1000;

    while (Date.now() < timeoutAt) {
      const status = await this.getCommandStatus(clusterId, contextId, commandId);

      if (status.status === 'Queued' || status.status === 'Running') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      return parseCommandExecutionResult(status);
    }

    throw new Error(
      `Timed out waiting for Databricks command execution after ${this.commandTimeoutSeconds} seconds.`,
    );
  }
}
