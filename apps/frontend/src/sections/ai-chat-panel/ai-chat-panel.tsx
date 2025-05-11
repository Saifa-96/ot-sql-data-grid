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
import { Skeleton } from "@/components/ui/skeleton";
import { compose, Operation } from "operational-transformation";
import { Fragment, useCallback } from "react";
import { Parser, sql2String } from "sql-parser";
import { SQLStore } from "sql-store";
import { match } from "ts-pattern";
import { toast } from "sonner";
import { EditorState, useEditorContext } from "../editor-context";
import useEventSource from "./use-event-source";
import {
  deleteColsOperation,
  deleteRowsOperation,
  insertColsOperation,
  insertRowsOperation,
  parseSQL,
  Task,
  updateOperation,
} from "./utils";

const AIChatPanel = () => {
  const context = useEditorContext();
  if (!context) {
    return (
      <div className="w-[400px] space-y-4">
        <Skeleton className="h-[737px]" />
        <Skeleton className="h-[126px]" />
      </div>
    );
  }
  return <AIChat {...context} />;
};

const AIChat: React.FC<EditorState> = ({ client, store }) => {
  const {
    messages,
    loading,
    inputText,
    handleSubmit,
    handleExecuteSQL,
    stop,
    handleInputTextChange,
  } = useEventSource(store);

  const handleApplySQL = useCallback(
    (content: string | null | undefined) => {
      if (!content) return;

      const result = new Parser(content).safeParse();
      if (result.type === "err") {
        handleSubmit("当前SQL语法不合格，请重新生成");
        return;
      }
      const parseResult = parseSQL(result.sql);
      if (parseResult.type === "err") {
        handleSubmit(parseResult.msg);
        return;
      }

      try {
        console.log("parse-result-tasks: ", parseResult.tasks);
        const operation = tasksToOperation(parseResult.tasks, store);
        console.log("ai-operation", operation);
        handleExecuteSQL();
        client.applyClient(operation);
      } catch (err) {
        console.error("apply-sql-error: ", err);
        toast.error("Failed to apply SQL: " + (err as Error).message);
      }
    },
    [client, handleExecuteSQL, handleSubmit, store]
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
                {messages.map((message, index) => {
                  if (message.role !== "user") {
                    return (
                      <Fragment key={message.id}>
                        <ChatMessage id={message.id} className="relative">
                          <ChatMessageAvatar />
                          {/* TODO: CodeBlock render Error, Replace Simple-AI later */}
                          <ChatMessageContent content={message.content} />
                          {index === messages.length - 1 &&
                            !loading &&
                            message.sqlContent && (
                              <div className="absolute right-0 bottom-0 translate-y-2/3">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleApplySQL(message.sqlContent)
                                  }
                                >
                                  Apply
                                </Button>
                              </div>
                            )}
                        </ChatMessage>
                      </Fragment>
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

const tasksToOperation = (tasks: Task[], store: SQLStore): Operation => {
  let operation: Operation = {};
  for (const task of tasks) {
    const queryResult = store.db.exec(sql2String(task.preview))[0];
    console.log("query-result: ", queryResult);
    const op = match(task.action)
      .returnType<Operation>()
      .with({ type: "update", tableName: "main_data" }, () =>
        updateOperation(queryResult)
      )
      .with({ type: "delete", tableName: "main_data" }, () =>
        deleteRowsOperation(queryResult)
      )
      .with({ type: "insert", tableName: "main_data" }, () =>
        insertRowsOperation(queryResult)
      )
      .with({ type: "insert", tableName: "columns" }, () => {
        return insertColsOperation(queryResult);
      })
      .with({ type: "delete", tableName: "columns" }, () =>
        deleteColsOperation(queryResult)
      )
      .otherwise(() => {
        console.error("Unknown operation type");
        return {};
      });
    operation = compose(operation, op);
  }
  return operation;
};
