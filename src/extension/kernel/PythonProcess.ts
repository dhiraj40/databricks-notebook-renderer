import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

export class PythonProcess {
  private process: ChildProcessWithoutNullStreams;
  private listeners = new Set<(data: string) => void>();
  private executionId = 0;
  private readonly ready: Promise<void>;

  constructor(command = 'python', args: string[] = []) {
    this.process = spawn(command, [...args, '-i', '-u', '-q'], {
      windowsHide: true,
    });

    this.process.stdout.on('data', (data) => {
      this.emit(data.toString());
    });

    this.process.stderr.on('data', (data) => {
      this.emit(data.toString());
    });

    this.ready = this.bootstrap();
  }

  async execute(code: string): Promise<string> {
    await this.ready;

    const marker = `__VSCODE_NOTEBOOK_END_${++this.executionId}__`;
    const encoded = Buffer.from(code, 'utf8').toString('base64');

    return this.captureUntilMarker(marker, () => {
      this.process.stdin.write(`__vsc_run(${JSON.stringify(encoded)}, ${JSON.stringify(marker)})\n`);
    });
  }

  private emit(data: string) {
    for (const listener of this.listeners) {
      listener(data);
    }
  }

  private removeListener(fn: (data: string) => void) {
    this.listeners.delete(fn);
  }

  private async bootstrap(): Promise<void> {
    const marker = '__VSCODE_NOTEBOOK_READY__';

    await this.captureUntilMarker(marker, () => {
      const setupScript = [
        'import base64, traceback',
        'def __vsc_run(encoded, marker):',
        '    try:',
        "        source = base64.b64decode(encoded).decode('utf-8')",
        "        exec(compile(source, '<cell>', 'exec'), globals(), globals())",
        '    except Exception:',
        '        traceback.print_exc()',
        '    print(marker, flush=True)',
        '',
        `print(${JSON.stringify(marker)}, flush=True)`,
        '',
      ].join('\n');

      this.process.stdin.write(setupScript);
    });
  }

  private captureUntilMarker(marker: string, onStart: () => void): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';

      const cleanup = () => {
        this.removeListener(handler);
        this.process.off('error', onError);
        this.process.off('exit', onExit);
      };

      const finalize = () => {
        cleanup();
        resolve(this.sanitizeOutput(output, marker));
      };

      const handler = (data: string) => {
        output += data;

        if (output.includes(marker)) {
          finalize();
        }
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onExit = (code: number | null) => {
        cleanup();
        reject(new Error(`Python process exited before completing execution (code: ${code ?? 'unknown'}).`));
      };

      this.listeners.add(handler);
      this.process.once('error', onError);
      this.process.once('exit', onExit);

      onStart();
    });
  }

  private sanitizeOutput(output: string, marker: string): string {
    return output
      .replace(/\r\n/g, '\n')
      .replace(/(^|\n)(?:(?:>>> |\.\.\. )+)/g, '$1')
      .replace(marker, '')
      .trimEnd();
  }

  dispose() {
    this.process.kill();
  }
}
