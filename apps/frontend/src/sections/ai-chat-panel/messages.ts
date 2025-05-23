import { z } from "zod";
import { v4 as uuid } from "uuid";
import { match } from "ts-pattern";

interface UserMsg {
  id: string;
  role: "user";
  content: string;
}

interface AssistantMsg {
  id: string;
  role: "assistant";
  content: string;
  reasoningContent: string;
  functionCall: { name: string; arguments: string };
}

interface Events {
  onUpdate: (msg: AssistantMsg) => void;
  onFinish: (msg: AssistantMsg) => void;
  onError: (error: Error) => void;
}

class Receiver {
  private msgStore: MessageStore;
  private assistantMsg: AssistantMsg;

  constructor(msgStore: MessageStore, assistantMsg: AssistantMsg) {
    this.msgStore = msgStore;
    this.assistantMsg = assistantMsg;
  }

  receive(chunk: unknown) {
    this.msgStore.receiveMsgChunk(this.assistantMsg, chunk);
  }
}

abstract class MessageStore {
  // private list: ;
  private sequence: (UserMsg | AssistantMsg)[] = [];
  readonly schema: z.ZodType<unknown>;
  events: Events | null = null;

  constructor(schema: z.ZodType<unknown>) {
    this.schema = schema;
  }

  appendUserMsg(content: string) {
    const msg: UserMsg = {
      id: uuid(),
      role: "user",
      content,
    };
    this.sequence.push(msg);
  }

  appendAssistantMsg(): Receiver {
    const msg: AssistantMsg = {
      id: uuid(),
      role: "assistant",
      content: "",
      reasoningContent: "",
      functionCall: { name: "", arguments: "" },
    };
    this.sequence.push(msg);
    return new Receiver(this, msg);
  }

  abstract processMessageChunk(
    msg: AssistantMsg,
    chunk: z.infer<typeof this.schema>
  ): AssistantMsg;

  abstract finishStream(
    chunk: z.infer<typeof this.schema>
  ):
    | { type: "finished" }
    | { type: "continuing" }
    | { type: "failed"; reason: Error };

  receiveMsgChunk(msg: AssistantMsg, chunkData: unknown) {
    const { success, data, error } = this.schema.safeParse(chunkData);
    if (!success) {
      this.events?.onError(error);
      return;
    }
    const result = this.finishStream(data);
    return match(result)
      .returnType<boolean>()
      .with({ type: "finished" }, () => {
        this.events?.onFinish(msg);
        return true;
      })
      .with({ type: "continuing" }, () => {
        const newMsg = this.processMessageChunk(msg, data);
        this.events?.onUpdate([msg]);
        return true;
      })
      .with({ type: "failed" }, ({ reason }) => {
        this.events?.onError(reason);
        return false;
      })
      .exhaustive();
  }

  subscribeEvents(events: Events) {
    this.events = events;
  }

  unsubscribeEvents() {
    this.events = null;
  }

  toMessages(): (UserMsg | AssistantMsg)[] {
    return this.sequence.filter((msg) => msg.content !== "");
  }
}
