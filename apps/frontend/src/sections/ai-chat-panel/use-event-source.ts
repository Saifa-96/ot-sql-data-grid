import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { SQLStore } from "sql-store";
import SSEPostman from "./sse-postman";
import { match, P } from "ts-pattern";
import io, { IOResult } from "@/utils/io";
import { compose, Operation } from "operational-transformation";
import { astToString, Parser } from "sql-parser";
import transformToTasks, { Task } from "./transform-to-tasks";
import {
  deleteColsOperation,
  deleteRowsOperation,
  insertColsOperation,
  insertRowsOperation,
  updateOperation,
} from "./transform-to-operation";
import { useEditorContext } from "../use-editor-context";
import { useSetEditorState } from "../use-editor-state";

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

const useEventSource = () => {
  const setState = useSetEditorState();
  const { store } = useEditorContext();

  const [inputText, setInputText] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [curtAstMsg, setCurtAstMsg] = useState<AssistantMsg | null>(null);
  const [loading, setLoading] = useState(false);

  const abortCtrl = useRef<(() => void) | null>(null);
  const handleSendMsg = useCallback(
    async (context: Message[]) => {
      const handleSendErrorMsg = (text: string) => {
        const errorMsg = chatMsg.error(text);
        const newMessages = [...context, errorMsg];
        setMessages(newMessages);
        handleSendMsg(newMessages);
      };

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
          match(astMsg.tool)
            .with(
              { name: "exec_sql", arguments: P.string },
              ({ arguments: args }) => {
                const result = processArguments({ args, store });
                if (result.type === "err") {
                  handleSendErrorMsg(result.err.message);
                } else {
                  setState({ mode: { type: "diff", operation: result.data } });
                }
              }
            )
            .otherwise(() => {
              throw new Error(`Unsupported tool: ${astMsg.tool?.name}`);
            });
        }
        astMsg.tool = null;
        setMessages(factor.append([astMsg]));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        const errorMsg = chatMsg.error(msg);
        setMessages(factor.append([errorMsg]));
      } finally {
        setCurtAstMsg(null);
        setLoading(false);
      }
    },
    [setState, store]
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
      newMessages.push(last);
      return newMessages;
    });
  }, []);

  return {
    inputText,
    handleInputTextChange,
    handleExecuteSQL,
    messages,
    curtAstMsg,
    loading,
    handleSubmit,
    handleSendMsg,
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
        newMsg.tool.arguments += chunk.tool.arguments;
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

interface ProcessArgumentsParams {
  args: string;
  store: SQLStore;
}
const processArguments = io.from<ProcessArgumentsParams, Operation>(
  ({ args, store }) => {
    const json = JSON.parse(args);
    const { sql } = argSchema.parse(json);
    const result = new Parser(sql).safeParse();
    if (result.type === "err") {
      return io.err("Unsupported SQL syntax, please regenerate.");
    }
    const transformResult = transformToTasks(result.sql);
    if (transformResult.type === "err") {
      return io.err(transformResult.err.message);
    }

    const tasks = transformResult.data;
    console.log("parse-result-tasks: ", tasks);
    const operation = tasksToOperation({ tasks, store });
    console.log("ai-operation", result);
    return operation;
  }
);

const argSchema = z.object({
  sql: z.string(),
});

const tasksToOperation = io.from<{ tasks: Task[]; store: SQLStore }, Operation>(
  ({ tasks, store }) => {
    let operation: Operation = {};
    for (const task of tasks) {
      const queryResult = store.db.exec(astToString(task.preview))[0];
      console.log("query-result: ", queryResult);
      const op = match(task.action)
        .returnType<IOResult<Operation>>()
        .with({ type: "update", tableName: "main_data" }, () =>
          updateOperation(queryResult)
        )
        .with({ type: "delete", tableName: "main_data" }, () =>
          deleteRowsOperation(queryResult)
        )
        .with({ type: "insert", tableName: "main_data" }, () =>
          insertRowsOperation(queryResult)
        )
        .with({ type: "insert", tableName: "columns" }, () =>
          insertColsOperation(queryResult)
        )
        .with({ type: "delete", tableName: "columns" }, () =>
          deleteColsOperation(queryResult)
        )
        .otherwise(() => io.err("Unknown operation"));

      if (op.type === "err") {
        return op;
      }
      operation = compose(operation, op.data);
    }
    return io.ok(operation);
  }
);
