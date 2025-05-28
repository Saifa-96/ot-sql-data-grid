import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { SQLStore } from "sql-store";
import SSEPostman from "./sse-postman";
import { match } from "ts-pattern";

interface UserMsg {
  id: string;
  role: "user";
  content: string;
}

interface SystemMsg {
  id: string;
  role: "system";
  content: string;
}

interface ToolMsg {
  id: string;
  role: "tool";
  content: string;
  name: string;
  tool_call_id: string;
}

interface AssistantMsg {
  id: string;
  role: "assistant";
  content: string;
  SQL: string | null;
  reasoningContent: string | null;
  tool: {
    id: string;
    name: string;
    arguments: string;
  } | null;
}

const chatMsg = {
  user: (text: string): UserMsg => ({
    id: uuid(),
    role: "user",
    content: text,
  }),
  error: (error: string): SystemMsg => ({
    id: uuid(),
    role: "system",
    content: `Error: ${error}`,
  }),
  tool: (params: { id: string; name: string; content: string }): ToolMsg => ({
    id: uuid(),
    role: "tool",
    content: params.content,
    name: params.name,
    tool_call_id: params.id,
  }),
};

type Message = AssistantMsg | UserMsg | SystemMsg | ToolMsg;
const factor = {
  append: (msgs: Message[]) => (list: Message[]) => {
    const newList = [...list];
    newList.push(...msgs);
    return newList;
  },
};

const useEventSource = (store: SQLStore) => {
  const [inputText, setInputText] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [curtAstMsg, setCurtAstMsg] = useState<AssistantMsg | null>(null);
  const [loading, setLoading] = useState(false);

  const abortCtrl = useRef<(() => void) | null>(null);
  const handleSendMsg = useCallback(
    async (context: Message[]) => {
      try {
        setLoading(true);
        const postman = VolcanoSSEPostman.new();
        abortCtrl.current = () => postman.stop();
        const iter = postman.send([
          ...context,
          {
            role: "system",
            content: [
              "Get the column information of the `main_data` table; Need invoke this function before any other operations.",
              "Returns an array of column metadata, each item contains:",
              "- fieldName: Column name in the database",
              "- displayName: Column name to be displayed in the UI",
              "- width: Column width in pixels",
              "- orderBy: Column name for sorting",
              "- type?: Column type, if not provided, default to 'TEXT'",
              "value: " + JSON.stringify(store.getColumns(), null, 2),
            ].join("\n"),
          },
        ]);
        for await (const msg of iter) {
          setCurtAstMsg(msg);
        }
        const newMessages = [...context];
        const astMsg = extractSQL(postman.getMsg());
        newMessages.push(astMsg);
        if (astMsg.tool?.name) {
          match(astMsg.tool.name)
            .with("get_`main_data`_table_information", () => {
              const toolMsg = chatMsg.tool({
                id: astMsg.tool?.id ?? "",
                name: astMsg.tool?.name ?? "",
                content: JSON.stringify(store.getColumns()),
              });
              newMessages.push(toolMsg);
              handleSendMsg(newMessages);
            })
            .otherwise(() => {
              throw new Error(`Unsupported tool: ${astMsg.tool?.name}`);
            });
        } else {
          setMessages(factor.append([astMsg]));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        const errorMsg = chatMsg.error(msg);
        setMessages(factor.append([errorMsg]));
      } finally {
        setCurtAstMsg(null);
        setLoading(false);
      }
    },
    [store]
  );

  const handleSubmit = () => {
    const text = inputText;
    if (text.trim() === "") return;
    setInputText("");
    const userMsg = chatMsg.user(text);
    handleSendMsg([...messages, userMsg]);
    setMessages(factor.append([userMsg]));
  };

  const stop = useCallback(() => {
    abortCtrl.current?.();
  }, []);

  const handleInputTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setInputText(text);
    },
    []
  );

  const handleExecuteSQL = useCallback(() => {
    setMessages((prev) => {
      const newMessages = [...prev];
      const last = { ...newMessages.pop()! } as AssistantMsg;
      last.SQL = null;
      newMessages.push(last);
      return newMessages;
    });
  }, []);

  const handleSendErrorMsg = (text: string) => {
    const errorMsg = chatMsg.error(text);
    const newMessages = [...messages, errorMsg];
    setMessages(newMessages);
    handleSendMsg(newMessages);
  };

  return {
    inputText,
    handleInputTextChange,
    handleExecuteSQL,
    messages,
    curtAstMsg,
    loading,
    handleSubmit,
    handleSendMsg,
    handleSendErrorMsg,
    stop,
  };
};

export default useEventSource;

const deltaSchema = z.object({
  content: z.string().nullish(),
  reasoning_content: z.string().nullish(),
  tool_calls: z
    .array(
      z.object({
        id: z.string().nullish(),
        function: z.object({
          name: z.string().nullish(),
          arguments: z.string().nullish(),
        }),
      })
    )
    .nullish(),
});

const extractSQL = (msg: AssistantMsg): AssistantMsg => {
  const codeBlockRegex = /```(?:[a-zA-Z0-9]*)\n([\s\S]*?)```/g;
  const matches = msg.content.matchAll(codeBlockRegex);
  const codeBlocks = matches.map((match) => match[1]).toArray();
  if (codeBlocks.length === 0) return msg;
  const newMsg = { ...msg };
  newMsg.SQL = codeBlocks[0];
  return newMsg;
};

class VolcanoSSEPostman extends SSEPostman<AssistantMsg> {
  private msg: AssistantMsg;

  constructor(msg: AssistantMsg) {
    super("/api/ai");
    this.msg = msg;
  }

  static new() {
    return new VolcanoSSEPostman({
      id: uuid(),
      role: "assistant",
      content: "",
      SQL: null,
      reasoningContent: null,
      tool: null,
    });
  }

  processMessageChunk(text: string): AssistantMsg {
    if (text === "[DONE]") return this.msg;

    const json = JSON.parse(text);
    const chunk = messageChunkSchema.parse(json);
    const newMsg = { ...this.msg };
    if (chunk.content) {
      newMsg.content += chunk.content;
    }
    if (chunk.tool) {
      newMsg.tool =
        newMsg.tool === null
          ? { id: "", name: "", arguments: "" }
          : { ...newMsg.tool };
      if (chunk.tool.id) {
        newMsg.tool.id = chunk.tool.id;
      }
      if (chunk.tool.name) {
        newMsg.tool.name = chunk.tool.name;
      }
      if (chunk.tool.arguments) {
        newMsg.tool.arguments = chunk.tool.arguments;
      }
    }
    this.msg = newMsg;
    return newMsg;
  }

  getMsg() {
    return this.msg;
  }
}

const messageChunkSchema = z
  .object({
    id: z.string(),
    choices: z.array(
      z.object({
        finish_reason: z
          .enum([
            "stop",
            "tool_calls",
            "content_filter",
            "max_token",
            "max_completion_tokens",
            "context_window",
          ])
          .nullish(),
        delta: deltaSchema,
      })
    ),
  })
  .transform((data) => {
    const { delta, finish_reason } = data.choices[0];
    const { tool_calls, content } = delta;
    const base = {
      content: content,
      finishReason: finish_reason,
      tool: null,
    };
    if (tool_calls && tool_calls.length > 0) {
      return {
        ...base,
        tool: {
          id: tool_calls[0].id ?? null,
          name: tool_calls[0].function.name ?? null,
          arguments: tool_calls[0].function.arguments ?? null,
        },
      };
    }
    return base;
  });
