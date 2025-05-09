"use client";

import { useEffect, useState } from "react";
import { EditorState, useEditorContext } from "../editor-context";
import SectionCard from "./section-card";
import EditorClient, { EventCallback } from "../editor-context/editor-client";
import OperationDetailItem, { OperationDetail } from "./operation-item";
import { v4 as uuid } from "uuid";
import { Operation } from "operational-transformation";
import { Skeleton } from "@/components/ui/skeleton";

const ClientOperations: React.FC = () => {
  const context = useEditorContext();
  if (!context) return <Skeleton className="w-[400px] h-full" />;
  return (
    <SectionCard title="Client Operations" className="w-[400px] h-full">
      <OperationDetailList {...context} />
    </SectionCard>
  );
};

const OperationDetailList: React.FC<EditorState> = ({ client }) => {
  const [changes, setChanges] = useState<OperationDetail[]>([]);
  useEffect(() => {
    const changeFromClient: EventCallback = (op) => {
      setChanges(unshiftOperationDetail("apply-client", op, client));
    };

    const changeFormServer: EventCallback = (op) => {
      setChanges(unshiftOperationDetail("apply-server", op, client));
    };

    const changeFromServerAck: EventCallback = (op) => {
      setChanges(unshiftOperationDetail("server-ack", op, client));
    };

    client.subscribeToEvent("apply-client", changeFromClient);
    client.subscribeToEvent("apply-server", changeFormServer);
    client.subscribeToEvent("server-ack", changeFromServerAck);
    return () => {
      client.unsubscribeFromEvent("apply-client", changeFromClient);
      client.unsubscribeFromEvent("apply-server", changeFormServer);
      client.unsubscribeFromEvent("server-ack", changeFromServerAck);
    };
  }, [client]);

  if (changes.length === 0)
    return (
      <div className="absolute top-0 left-0 bottom-0 right-0 flex justify-center items-center">
        <p className="text-sm text-gray-400">
          No operations have been performed yet.
        </p>
      </div>
    );

  return (
    <div className="p-2 space-y-2">
      {changes.map((change) => (
        <OperationDetailItem key={change.id} data={change} />
      ))}
    </div>
  );
};

const unshiftOperationDetail =
  (
    action: "apply-client" | "apply-server" | "server-ack",
    operation: Operation,
    client: EditorClient
  ) =>
  (prev: OperationDetail[]): OperationDetail[] =>
    [
      {
        id: uuid(),
        action,
        operation,
        revision: client.revision,
        state: client.state,
      },
      ...prev,
    ];

export default ClientOperations;
