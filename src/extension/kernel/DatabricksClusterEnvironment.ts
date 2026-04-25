import { ExecutionQueue } from './ExecutionQueue';
import {
  DatabricksCliClient,
  DatabricksClusterSummary,
} from './DatabricksCli';
import { KernelEnvironment, KernelLanguage } from './KernelEnvironment';

export class DatabricksClusterEnvironment implements KernelEnvironment {
  public readonly executionKind = 'databricks' as const;
  public readonly supportedLanguages: readonly KernelLanguage[] = [
    'python',
    'sql',
    'shellscript',
    'scala',
  ];

  private readonly queue = new ExecutionQueue();
  private readonly contexts = new Map<KernelLanguage, string>();

  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly clusterId: string,
    private clusterState: string | undefined,
    private readonly client: DatabricksCliClient,
  ) {}

  get description() {
    return this.clusterState
      ? `Databricks cluster ${this.label} (${this.clusterState.toLowerCase()}).`
      : `Databricks cluster ${this.label}.`;
  }

  execute(language: KernelLanguage, code: string): Promise<string> {
    return this.queue.enqueue(async () => {
      await this.client.ensureClusterRunning(this.clusterId, this.clusterState);
      this.clusterState = 'RUNNING';

      let contextId = this.contexts.get(language);

      if (!contextId) {
        const context = await this.client.createCommandContext(this.clusterId, language);
        contextId = context.id;
        this.contexts.set(language, contextId);
      }

      const command = await this.client.executeCommand(
        this.clusterId,
        contextId,
        language,
        code,
      );

      return this.client.waitForCommand(this.clusterId, contextId, command.id);
    });
  }

  async dispose() {
    const contexts = [...this.contexts.entries()];
    this.contexts.clear();

    await Promise.allSettled(
      contexts.map(([, contextId]) =>
        this.client.destroyCommandContext(this.clusterId, contextId),
      ),
    );
  }
}

export const createDatabricksClusterEnvironment = (
  cluster: DatabricksClusterSummary,
  client = new DatabricksCliClient(),
) => {
  return new DatabricksClusterEnvironment(
    `databricks-notebook-renderer.cluster.${cluster.id}`,
    cluster.name,
    cluster.id,
    cluster.state,
    client,
  );
};
