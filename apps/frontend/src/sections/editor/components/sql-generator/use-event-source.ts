import { useRef, useState } from "react";
import {
  EventSourceMessage,
  fetchEventSource,
} from "@microsoft/fetch-event-source";
import { z } from "zod";

const ARK_API_KEY = "1e2dfce3-6cbd-4110-be06-4cce3bf185a5";
const URL = "https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions";
const useEventSource = (dbInfo: {
  dataTableName: string;
  columnTableName: string;
}) => {
  const [isBreak, setIsBreak] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reasonContent, setReasonContent] = useState<string>("");
  const [content, setContent] = useState<string>("");

  const ctrlRef = useRef<AbortController | null>(null);
  const send = async (text: string) => {
    setIsBreak(false);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    const reasonReceiver = new Receiver(setReasonContent);
    const contentReceiver = new Receiver(setContent);
    const handleMessage = ({ data }: EventSourceMessage) => {
      if (data === "[DONE]") {
        ctrl.abort();
        setLoading(false);
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
          const { content = "", reasoning_content = "" } = delta;
          contentReceiver.append(content);
          reasonReceiver.append(reasoning_content);
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
      body: generateRequestBody(text, dbInfo),
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
  };

  const stop = () => {
    setIsBreak(true);
    ctrlRef.current?.abort();
    ctrlRef.current = null;
  };

  const cancel = () => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    setReasonContent("");
    setContent("");
  };

  return {
    isBreak,
    loading,
    reasonContent,
    content,
    hasAnswer: reasonContent.length > 0 || content.length > 0,
    cancel,
    send,
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
  cb: (content: string) => void;

  constructor(cb: (content: string) => void) {
    this.cb = cb;
  }

  append(chunk: string) {
    this.content += chunk;
    this.cb(this.content);
  }
}

const generateRequestBody = (
  text: string,
  dbInfo: {
    dataTableName: string;
    columnTableName: string;
  }
) => {
  const { columnTableName, dataTableName } = dbInfo;
  return JSON.stringify({
    model: "bot-20250322214511-lxccb",
    stream: true,
    messages: [
      {
        role: "system",
        content: `
            1. The db information is ${JSON.stringify(dbInfo)}
            2. The column table name is ${columnTableName}, the data table name is ${dataTableName}.
            3. The \`columnTableHeader\` is the column table column information, it can't be modified.
            4. The \`columnTableRows\` is the column table row information which presence data table columns, it can be modified.
            5. THe \`dataTableHeader\` is the data table column information, it can be modified.
            6. If users want to modify the data table columns, you need to modify the \`dataTableHeader\` and \`columnTableRows\`.
            `,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });
};
