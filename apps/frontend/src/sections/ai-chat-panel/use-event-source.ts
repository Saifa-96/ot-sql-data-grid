import {
  EventSourceMessage,
  fetchEventSource,
} from "@microsoft/fetch-event-source";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { systemPrompt } from "./system-prompt";
import { v4 as uuid } from "uuid";
import { SQLStore } from "sql-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ARK_API_KEY = "1e2dfce3-6cbd-4110-be06-4cce3bf185a5";
const URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const useEventSource = (store: SQLStore) => {
  const [inputText, setInputText] = useState<string>(
    "帮我把Name和Age合并为一列，age拼接在name后面，并且用括号包起来，同时删除原来的name和age列。"
  );
  const inputTextRef = useRef<string>(inputText);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBreak, setIsBreak] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [reasonContent, setReasonContent] = useState<string>("");
  // const [content, setContent] = useState<string>("");

  const ctrlRef = useRef<AbortController | null>(null);
  const handleSubmit = useCallback(async (msg?: string) => {
    const text = msg ?? inputTextRef.current;
    if (!text.trim()) return;
    setInputText("");
    inputTextRef.current = "";

    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: "user",
        content: text,
      },
      {
        id: uuid(),
        role: "assistant",
        content: "正在思考中...",
      },
    ]);
    setIsBreak(false);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    const contentReceiver = new Receiver();
    const handleMessage = ({ data }: EventSourceMessage) => {
      if (data === "[DONE]") {
        ctrl.abort();
        setLoading(false);
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages.pop();
          if (lastMessage) {
            newMessages.push({
              ...lastMessage,
              content: contentReceiver.content,
            });
          }
          return newMessages;
        });
        return;
      }
      const response = JSON.parse(data);
      const {
        success,
        error,
        data: parsedData,
      } = dataChunk.safeParse(response);
      if (success) {
        parsedData.choices.forEach(({ delta }) => {
          const { content = "" } = delta;
          contentReceiver.append(content);
          // reasonReceiver.append(reasoning_content);
        });
      } else {
        console.error(error);
      }
    };

    fetchEventSource(URL, {
      method: "POST",
      openWhenHidden: true,
      headers: {
        Authorization: `Bearer ${ARK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: generateRequestBody(text, store.getSettings()),
      signal: ctrl.signal,
      onmessage: handleMessage,
      onerror(err) {
        console.error(err);
      },
      async onopen() {
        setLoading(true);
      },
      onclose() {
        console.log("closed");
        setLoading(false);
      },
    });
  }, [store]);

  const stop = useCallback(() => {
    setIsBreak(true);
    ctrlRef.current?.abort();
    ctrlRef.current = null;
  }, []);

  const handleInputTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setInputText(text);
      inputTextRef.current = text;
    },
    []
  );

  return {
    inputText,
    handleInputTextChange,
    messages,
    isBreak,
    loading,
    handleSubmit,
    stop,
  };
};

export default useEventSource;

const dataChunk = z.object({
  choices: z.array(
    z.object({
      delta: z.object({
        content: z.string().optional(),
        reasoning_content: z.string().optional(),
      }),
    })
  ),
});

class Receiver {
  content: string = "";
  cb?: (content: string) => void;

  constructor(cb?: (content: string) => void) {
    this.cb = cb;
  }

  append(chunk: string) {
    this.content += chunk;
    this.cb?.(this.content);
  }
}

const generateRequestBody = (
  text: string,
  dbInfo: {
    dataTableName: string;
    columnTableName: string;
  }
) => {
  return JSON.stringify({
    model: "deepseek-v3-250324",
    stream: true,
    messages: [
      {
        role: "system",
        content: systemPrompt(dbInfo),
      },
      {
        role: "user",
        content: text,
      },
    ],
  });
};
