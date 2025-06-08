"use client";

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
import useEventSource from "./use-event-source";
import { useEditorState } from "../use-editor-state";

const AIChatPanel: React.FC = () => {
  const [{ mode }] = useEditorState();
  const {
    messages,
    loading,
    inputText,
    curtAstMsg,
    handleSubmit,
    stop,
    handleInputTextChange,
  } = useEventSource();
  console.log(messages);

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
                  .map((message) => {
                    if (message.role === "assistant") {
                      return (
                        <ChatMessage key={message.id} id={message.id}>
                          <ChatMessageAvatar />
                          <ChatMessageContent content={message.content} />
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
          <ChatInputTextArea
            disabled={mode.type === "diff"}
            placeholder="Type a message..."
          />
          <ChatInputSubmit />
        </ChatInput>
      </div>
    </div>
  );
};

export default AIChatPanel;
