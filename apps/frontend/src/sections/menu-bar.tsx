"use client";
import { DynamicFieldData } from "@/components/rhf-form/dynamic-control-types";
import { Button } from "@/components/ui/button";
import * as op from "@/utils/operation-helper";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { SQLStore } from "sql-store";
import { v4 as uuid } from "uuid";
import { openColumnFormDialog } from "./modal/column-form-dialog";
import { openRecordFormDialog } from "./modal/record-form-dialog";
import { EditorContext, useEditorContext } from "./use-editor-context";
import { useEditorState } from "./use-editor-state";

const MenuBar: React.FC = () => {
  const [{ mode }] = useEditorState();
  const context = useEditorContext();

  return (
    <div className="p-2 border-b flex justify-between items-center">
      {mode.type === "diff" ? (
        <DiffButtonBar {...context} />
      ) : (
        <ButtonBar {...context} />
      )}
      <ClientCount />
    </div>
  );
};

const DiffButtonBar: React.FC<EditorContext> = ({ client }) => {
  const [{ mode }, setEditorState] = useEditorState();
  return (
    <div className="space-x-2">
      <Button
        variant="outline"
        onClick={() => {
          setEditorState({ mode: { type: "edit" } });
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={() => {
          if (mode.type !== "diff") return;
          setEditorState({ mode: { type: "edit" } });
          setTimeout(() => {
            client.applyClient(mode.operation);
          }, 0);
        }}
      >
        Confirm
      </Button>
    </div>
  );
};

const ButtonBar: React.FC<EditorContext> = ({ store, client, socket }) => {
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

const ClientCount: React.FC = () => {
  const { socket } = useEditorContext();
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
