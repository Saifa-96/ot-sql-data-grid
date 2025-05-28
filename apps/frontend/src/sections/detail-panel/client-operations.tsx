"use client";

import { useEffect, useState } from "react";
import SectionCard from "./section-card";
import OperationDetailItem, { OperationDetail } from "./operation-item";
import { v4 as uuid } from "uuid";
import { Operation } from "operational-transformation";
import {
  EditorClient,
  EventCallback,
  useEditorContext,
} from "../use-editor-context";

const ClientOperations: React.FC = () => {
  const { client } = useEditorContext();
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

  return (
    <SectionCard title="Client Operations" className="w-[400px] h-full">
      {changes.length === 0 ? (
        <div className="absolute top-0 left-0 bottom-0 right-0 flex justify-center items-center">
          <p className="text-sm text-gray-400">
            No operations have been performed yet.
          </p>
        </div>
      ) : (
        <div className="p-2 space-y-2">
          {changes.map((change) => (
            <OperationDetailItem key={change.id} data={change} />
          ))}
        </div>
      )}
    </SectionCard>
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
