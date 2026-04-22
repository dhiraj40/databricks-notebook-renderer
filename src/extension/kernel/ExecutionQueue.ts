// src/kernel/ExecutionQueue.ts
export class ExecutionQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = false;

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task());
        } catch (error) {
          reject(error);
        }
      });

      void this.run();
    });
  }

  private async run() {
    if (this.running) {
      return;
    }

    this.running = true;

    while (this.queue.length) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }

    this.running = false;
  }
}
