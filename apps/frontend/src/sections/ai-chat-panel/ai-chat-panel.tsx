"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChatInput,
  ChatInputSubmit,
  ChatInputTextArea,
} from "@/components/ui/chat-input";
import {
  ChatMessage,
  ChatMessageAvatar,
  ChatMessageContent,
} from "@/components/ui/chat-message";
import { ChatMessageArea } from "@/components/ui/chat-message-area";
import { Separator } from "@/components/ui/separator";
import io, { IOResult } from "@/utils/io";
import { compose, Operation } from "operational-transformation";
import { useCallback } from "react";
import { toast } from "sonner";
import { astToString, Parser } from "sql-parser";
import { SQLStore } from "sql-store";
import { match } from "ts-pattern";
import { useEditorContext } from "../use-editor-context";
import {
  deleteColsOperation,
  deleteRowsOperation,
  insertColsOperation,
  insertRowsOperation,
  updateOperation,
} from "./transform-to-operation";
import transformToTasks, { Task } from "./transform-to-tasks";
import useEventSource from "./use-event-source";

const AIChatPanel: React.FC = () => {
  const { store, client } = useEditorContext();
  const {
    messages,
    loading,
    inputText,
    curtAstMsg,
    handleSubmit,
    handleSendErrorMsg,
    handleExecuteSQL,
    stop,
    handleInputTextChange,
  } = useEventSource(store);

  const handleApplySQL = useCallback(
    (content: string | null | undefined) => {
      if (!content) return;

      const result = new Parser(content).safeParse();
      if (result.type === "err") {
        handleSendErrorMsg("Unsupported SQL syntax, please regenerate.");
        return;
      }
      const transformResult = transformToTasks(result.sql);
      if (transformResult.type === "err") {
        handleSendErrorMsg(transformResult.err.message);
        return;
      }

      try {
        const tasks = transformResult.data;
        console.log("parse-result-tasks: ", tasks);
        const result = tasksToOperation({ tasks, store });
        console.log("ai-operation", result);
        handleExecuteSQL();
        if (result.type === "err") {
          const msg =
            result.err.type === "expected"
              ? result.err.message
              : "Failed to apply SQL, please regenerate.";
          console.error("apply-sql-error: ", result.err);
          handleSendErrorMsg(msg);
        } else {
          client.applyClient(result.data);
        }
      } catch (err) {
        console.error("apply-sql-error: ", err);
        toast.error("Failed to apply SQL: " + (err as Error).message);
      }
    },
    [client, handleExecuteSQL, handleSendErrorMsg, store]
  );

  return (
    <div className="flex flex-col w-[400px] gap-4">
      <Card className="flex flex-col flex-1">
        <h1 className="font-bold py-3 px-4 border-b">AI Assistant</h1>
        <Separator />
        <div className="flex-1 relative">
          <div className="absolute top-0 left-0 right-0 bottom-0">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-sm">Ask me anything about your data.</p>
                  <p className="text-xs">I will answer you in a few seconds.</p>
                </div>
              </div>
            ) : (
              <ChatMessageArea
                scrollButtonAlignment="center"
                className="px-4 py-6 space-y-4"
              >
                {messages
                  .filter((msg) => {
                    return (
                      (msg.role === "assistant" || msg.role === "user") &&
                      !!msg.content
                    );
                  })
                  .map((message, index, arr) => {
                    if (message.role === "assistant") {
                      const showBtn = index === arr.length - 1 && !!message.SQL;
                      return (
                        <ChatMessage key={message.id} id={message.id}>
                          <ChatMessageAvatar />
                          <ChatMessageContent content={message.content}>
                            {showBtn && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleApplySQL(message.SQL)}
                              >
                                Apply This SQL
                              </Button>
                            )}
                          </ChatMessageContent>
                        </ChatMessage>
                      );
                    }
                    return (
                      <ChatMessage
                        key={message.id}
                        id={message.id}
                        variant="bubble"
                        type="outgoing"
                      >
                        <ChatMessageContent content={message.content} />
                      </ChatMessage>
                    );
                  })}
                {curtAstMsg && (
                  <ChatMessage
                    key={curtAstMsg.id}
                    id={curtAstMsg.id}
                    className="relative"
                  >
                    <ChatMessageAvatar />
                    <ChatMessageContent
                      content={
                        curtAstMsg.content === ""
                          ? "Thinking..."
                          : curtAstMsg.content
                      }
                    />
                  </ChatMessage>
                )}
              </ChatMessageArea>
            )}
          </div>
        </div>
      </Card>

      <div className="max-w-2xl mx-auto w-full">
        <ChatInput
          value={inputText}
          onChange={handleInputTextChange}
          onSubmit={handleSubmit}
          loading={loading}
          onStop={stop}
        >
          <ChatInputTextArea placeholder="Type a message..." />
          <ChatInputSubmit />
        </ChatInput>
      </div>
    </div>
  );
};

export default AIChatPanel;

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
