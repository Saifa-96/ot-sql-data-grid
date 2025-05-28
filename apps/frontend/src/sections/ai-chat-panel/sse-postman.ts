import { fetchEventSource } from "@microsoft/fetch-event-source";

abstract class SSEPostman<T> {
  private abortCtrl: AbortController | null = null;

  constructor(private url: string) {
    this.url = url;
  }

  abstract processMessageChunk(text: string): T;

  async stop() {
    if (this.abortCtrl) {
      this.abortCtrl.abort();
      this.abortCtrl = null;
    }
  }

  async *send(context: object[]): AsyncGenerator<T> {
    const abortCtrl = new AbortController();
    this.abortCtrl = abortCtrl;

    const url = this.url;
    const stream = new ReadableStream<string>({
      start(ctrl) {
        fetchEventSource(url, {
          signal: abortCtrl.signal,
          method: "POST",
          body: JSON.stringify(context),
          openWhenHidden: true,
          async onopen(response) {
            if (!response.ok) {
              const msg = `Failed to connect: ${response.status} ${response.statusText}`;
              const err = new Error(msg);
              ctrl.error(err);
            }
          },
          onmessage(ev) {
            ctrl.enqueue(ev.data);
          },
          onclose() {
            ctrl.close();
          },
          onerror(err) {
            ctrl.error(err);
          },
        });
      },
    });

    const reader = stream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        yield this.processMessageChunk(value);
      }
    } catch (e) {
      throw e;
    } finally {
      this.abortCtrl.abort();
      this.abortCtrl = null;
      reader.releaseLock();
    }
  }
}

export default SSEPostman;
