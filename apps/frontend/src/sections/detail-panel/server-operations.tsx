"use client";

import { Badge } from "@/components/ui/badge";
import { Operation } from "operational-transformation";
import { Fragment, useEffect, useState } from "react";
import { useEditorContext } from "../use-editor-context";
import DataPreview from "./data-preview";
import SectionCard from "./section-card";

const ServerOperations: React.FC = () => {
  const { socket } = useEditorContext();
  const [operations, setOperations] = useState<Operation[]>([]);

  useEffect(() => {
    const update = (ops: Operation[]) => setOperations(ops);
    socket.on("all-operations", update);
    socket.emit("get-all-operations");
    return () => {
      socket.off("all-operations", update);
    };
  }, [socket]);

  return (
    <SectionCard title="Server Operations" className="w-[800px] h-full">
      {operations.length === 0 ? (
        <div className="absolute top-0 left-0 bottom-0 right-0 flex justify-center items-center">
          <p className="text-sm text-gray-400">
            No operations have been performed yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-4 p-4">
          {operations.map((op, i) => (
            <Fragment key={i}>
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700 px-2 py-1 rounded">
                  revision:{" "}
                  <span className="text-blue-600 font-semibold">{i}</span>
                </span>
              </div>
              <BadgeItem title="Insert Columns" data={op.insertColumns} />
              <BadgeItem title="Delete Columns" data={op.deleteColumns} />
              <BadgeItem title="Insert Records" data={op.insertRecords} />
              <BadgeItem title="Update Records" data={op.updateRecords} />
              <BadgeItem title="Delete Records" data={op.deleteRecords} />
            </Fragment>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

interface BadgeItemProps {
  title: string;
  data?: object | Array<object>;
}

const BadgeItem: React.FC<BadgeItemProps> = ({ title, data }) => {
  return (
    <div className="flex items-center justify-center">
      {data ? (
        <DataPreview data={data}>
          <Badge>{title}</Badge>
        </DataPreview>
      ) : (
        <Badge className="opacity-30" variant="secondary">
          {title}
        </Badge>
      )}
    </div>
  );
};

export default ServerOperations;
