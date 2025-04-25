"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FC, useRef } from "react";
import useEventSource from "./use-event-source";
import ContentBlock from "./content-block";
import { Parser } from "operational-transformation";
import { parseSQL, Task } from "../../utils";

interface SQLGeneratorProps {
  dbInfo: { dataTableName: string; columnTableName: string };
  onApplySQL: (tasks: Task[]) => void;
}
const SQLGenerator: FC<SQLGeneratorProps> = ({ dbInfo, onApplySQL }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { loading, send, stop, cancel, hasAnswer, content, reasonContent } =
    useEventSource(dbInfo);

  const handleRun = async () => {
    const text = textAreaRef.current?.value;
    if (!text) return;
    send(text);
  };

  const handleApplySQL = () => {
    const result = new Parser(content).safeParse();
    if (result.type === "err") {
      send("当前SQL语法不合格，请重新生成");
      return;
    }
    const parseResult = parseSQL(result.sql);
    if (parseResult.type === "err") {
      send(parseResult.msg);
      return;
    }
    onApplySQL(parseResult.tasks);
  };

  return (
    <div className="w-[800px] space-y-3 mt-3">
      <p className="text-gray-500 text-s">Using AI to generate SQL.</p>
      {hasAnswer ? (
        <>
          <ContentBlock reasonContent={reasonContent} content={content} />
          <div className="flex flex-row-reverse gap-4">
            {loading ? (
              <Button size="sm" onClick={stop}>
                Stop
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={handleApplySQL}>
                  Apply SQL
                </Button>
                <Button size="sm" variant="outline" onClick={cancel}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <Textarea
            defaultValue="帮我把Name和Gender合并为一列，gender拼接在name后面，并且用括号包起来，同时删除原来的name和gender列。"
            ref={textAreaRef}
            placeholder="Please, describe your requirement."
          />
          <div className="flex flex-row-reverse">
            <Button
              size="sm"
              type="button"
              disabled={loading}
              onClick={handleRun}
            >
              Run
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default SQLGenerator;
