import { spawn } from 'child_process';
import { ExecutionQueue } from './ExecutionQueue';
import { displayKernelLanguage, KernelEnvironment, KernelLanguage } from './KernelEnvironment';
import { PythonProcess } from './PythonProcess';

type CommandSpec = {
  command: string;
  args: string[];
};

type LanguageExecutor = {
  execute(code: string): Promise<string>;
  dispose?(): void | Promise<void>;
};

const normalizeOutput = (value: string) => value.replace(/\r\n/g, '\n').trimEnd();

const checkCommandAvailable = (command: string, args: string[] = ['--version']): Promise<boolean> => {
  return new Promise((resolve) => {
    let settled = false;

    try {
      const process = spawn(command, args, {
        stdio: 'ignore',
        windowsHide: true,
      });

      const finish = (result: boolean) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };

      process.once('error', () => finish(false));
      process.once('exit', (code) => finish(code === 0));
    } catch {
      resolve(false);
    }
  });
};

const runCommand = (command: string, args: string[], stdin?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
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
        resolve(normalizeOutput(stdout || stderr));
        return;
      }

      reject(new Error(normalizeOutput(stderr) || `Command "${command}" exited with code ${code ?? 'unknown'}.`));
    });

    if (stdin) {
      process.stdin.write(stdin);
    }

    process.stdin.end();
  });
};

class PythonExecutor implements LanguageExecutor {
  private readonly process: PythonProcess;

  constructor(command: string, args: string[]) {
    this.process = new PythonProcess(command, args);
  }

  execute(code: string): Promise<string> {
    return this.process.execute(code);
  }

  dispose() {
    this.process.dispose();
  }
}

class ShellExecutor implements LanguageExecutor {
  constructor(private readonly shell: CommandSpec) {}

  execute(code: string): Promise<string> {
    return runCommand(this.shell.command, [...this.shell.args, code]);
  }
}

class ScalaExecutor implements LanguageExecutor {
  constructor(private readonly scala: CommandSpec) {}

  execute(code: string): Promise<string> {
    return runCommand(this.scala.command, [...this.scala.args, code]);
  }
}

class PythonSqlExecutor implements LanguageExecutor {
  private static readonly runnerScript = [
    'import base64, sqlite3, sys',
    "source = base64.b64decode(sys.argv[1]).decode('utf-8')",
    "statements = [segment.strip() for segment in source.split(';') if segment.strip()]",
    "connection = sqlite3.connect(':memory:')",
    'cursor = connection.cursor()',
    'try:',
    '    last_cursor = None',
    '    for statement in statements:',
    '        last_cursor = cursor.execute(statement)',
    '    connection.commit()',
    '    if last_cursor is None:',
    "        print('No SQL statements to execute.')",
    '    elif last_cursor.description:',
    "        headers = [column[0] for column in last_cursor.description]",
    "        print(' | '.join(headers))",
    '        for row in last_cursor.fetchall():',
    "            print(' | '.join('' if value is None else str(value) for value in row))",
    '    else:',
    "        print('Query executed successfully.')",
    'finally:',
    '    connection.close()',
  ].join('\n');

  constructor(
    private readonly pythonCommand: string,
    private readonly pythonArgs: string[],
  ) {}

  execute(code: string): Promise<string> {
    const encoded = Buffer.from(code, 'utf8').toString('base64');
    return runCommand(this.pythonCommand, [...this.pythonArgs, '-c', PythonSqlExecutor.runnerScript, encoded]);
  }
}

class LocalKernelEnvironment implements KernelEnvironment {
  private readonly queue = new ExecutionQueue();
  public readonly executionKind = 'local' as const;

  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly supportedLanguages: readonly KernelLanguage[],
    private readonly executors: ReadonlyMap<KernelLanguage, LanguageExecutor>,
    public readonly description?: string,
  ) {}

  execute(language: KernelLanguage, code: string): Promise<string> {
    const executor = this.executors.get(language);
    if (!executor) {
      throw new Error(`The selected kernel environment does not support ${displayKernelLanguage(language)} cells yet.`);
    }

    return this.queue.enqueue(() => executor.execute(code));
  }

  dispose() {
    for (const executor of this.executors.values()) {
      executor.dispose?.();
    }
  }
}

const detectPythonCommand = async () => {
  for (const command of process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python']) {
    const args = command === 'py' ? ['-3', '--version'] : ['--version'];
    if (await checkCommandAvailable(command, args)) {
      return command === 'py' ? { command, args: ['-3'] } : { command, args: [] };
    }
  }

  return undefined;
};

const detectShellCommand = async (): Promise<CommandSpec | undefined> => {
  if (process.platform === 'win32') {
    return { command: 'powershell', args: ['-NoProfile', '-NonInteractive', '-Command'] };
  }

  for (const candidate of ['bash', 'sh']) {
    if (await checkCommandAvailable(candidate)) {
      return { command: candidate, args: ['-lc'] };
    }
  }

  return undefined;
};

const detectScalaCommand = async (): Promise<CommandSpec | undefined> => {
  if (await checkCommandAvailable('scala', ['-version'])) {
    return { command: 'scala', args: ['-e'] };
  }

  return undefined;
};

export const createLocalKernelEnvironment = async (): Promise<KernelEnvironment | undefined> => {
  const executors = new Map<KernelLanguage, LanguageExecutor>();
  const python = await detectPythonCommand();
  const shell = await detectShellCommand();
  const scala = await detectScalaCommand();

  if (python) {
    executors.set('python', new PythonExecutor(python.command, python.args));
    executors.set('sql', new PythonSqlExecutor(python.command, python.args));
  }

  if (shell) {
    executors.set('shellscript', new ShellExecutor(shell));
  }

  if (scala) {
    executors.set('scala', new ScalaExecutor(scala));
  }

  if (executors.size === 0) {
    return undefined;
  }

  const supportedLanguages = ['python', 'sql', 'shellscript', 'scala'].filter(
    (language): language is KernelLanguage => executors.has(language as KernelLanguage),
  );
  const description = `Auto-selected local runtime for ${supportedLanguages
    .map(language => displayKernelLanguage(language))
    .join(', ')} cells.`;

  return new LocalKernelEnvironment(
    'databricks-notebook-renderer.local-auto',
    'Local Auto',
    supportedLanguages,
    executors,
    description,
  );
};
