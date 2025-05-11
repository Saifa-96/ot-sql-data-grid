import {
  EventSourceMessage,
  fetchEventSource,
} from "@microsoft/fetch-event-source";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { SQLStore } from "sql-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sqlContent?: string | null;
}

const useEventSource = (store: SQLStore) => {
  const [inputText, setInputText] = useState<string>("");
  const inputTextRef = useRef<string>(inputText);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBreak, setIsBreak] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [reasonContent, setReasonContent] = useState<string>("");
  // const [content, setContent] = useState<string>("");

  const ctrlRef = useRef<AbortController | null>(null);
  const handleSubmit = useCallback(
    async (msg?: string) => {
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
                sqlContent: getSqlContent(contentReceiver.content),
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

      fetchEventSource("/api/ai", {
        method: "POST",
        openWhenHidden: true,
        body: JSON.stringify({
          text,
          dbInfo: store.getSettings(),
        }),
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
    },
    [store]
  );

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

  const handleExecuteSQL = useCallback(() => {
    setMessages((prev) => {
      const newMessages = [...prev];
      const last = { ...newMessages.pop()! };
      last.sqlContent = undefined;
      newMessages.push(last);
      return newMessages;
    });
  }, []);

  return {
    inputText,
    handleInputTextChange,
    handleExecuteSQL,
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

const codeBlockRegex = /```(?:[a-zA-Z0-9]*)\n([\s\S]*?)```/g;
const getSqlContent = (content: string): string | null => {
  const matches = content.matchAll(codeBlockRegex);
  const codeBlocks = matches.map((match) => match[1]).toArray();
  if (codeBlocks.length === 0) return null;
  return codeBlocks[0];
};
