"use client";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { EditorState, useEditorContext } from "./editor-context";
import { useEffect, useState } from "react";
import { openColumnFormDialog } from "./modal/column-form-dialog";
import { openRecordFormDialog } from "./modal/record-form-dialog";
import { DynamicFieldData } from "@/components/rhf-form/dynamic-control-types";
import { SQLStore } from "sql-store";
import * as op from "@/utils/operation-helper";
import { v4 as uuid } from "uuid";
import { Skeleton } from "@/components/ui/skeleton";

const MenuBar: React.FC = () => {
  const context = useEditorContext();
  return (
    <div className="p-2 border-b flex justify-between items-center">
      {context ? (
        <ButtonBar {...context} />
      ) : (
        <div className="flex gap-2">
          <Skeleton className="w-[94px] h-[32px]" />
          <Skeleton className="w-[94px] h-[32px]" />
          <Skeleton className="w-[94px] h-[32px]" />
        </div>
      )}
      {context && <ClientCount {...context} />}
    </div>
  );
};

const ButtonBar: React.FC<EditorState> = ({ store, client, socket }) => {
  const handleNewColumn = () => {
    openColumnFormDialog({
      onSubmit(data) {
        client.applyClient(op.insertColumn(data));
      },
    });
  };

  const handleNewRecord = () => {
    openRecordFormDialog({
      fields: getRecordFields(store),
      onSubmit(data) {
        client.applyClient(op.insertRecord(uuid(), data));
      },
    });
  };

  const handleResetDB = () => {
    socket.emit("reset");
  };

  return (
    <div className="space-x-2">
      <Button size="sm" variant="outline" onClick={handleNewColumn}>
        New Column
      </Button>
      <Button size="sm" variant="outline" onClick={handleNewRecord}>
        New Record
      </Button>
      <Button size="sm" variant="outline" onClick={handleResetDB}>
        Reset Database
      </Button>
    </div>
  );
};

const ClientCount: React.FC<EditorState> = ({ socket }) => {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const update = (c: number) => setCount(c);
    socket.on("connection-count", update);
    socket.emit("get-connection-count");
    return () => {
      socket.off("connection-count", update);
    };
  }, [socket]);
  return (
    <div className="flex items-center space-x-2 mr-2">
      <Users size={20} />
      <span className="text-gray-500">{count}</span>
    </div>
  );
};

const getRecordFields = (store: SQLStore): DynamicFieldData[] => {
  return store
    .getColumns()
    .sort((a, b) => a.orderBy - b.orderBy)
    .map<DynamicFieldData>((column) => ({
      label: column.displayName,
      fieldName: column.fieldName,
      fieldConfig: {
        type: "text",
        defaultValue: "",
      },
      validator: {
        min: 1,
        max: 40,
        required: true,
      },
    }));
};

export default MenuBar;
