"use client";
import { isServer, useSuspenseQuery } from "@tanstack/react-query";
import mitt from "mitt";
import { Client, Operation } from "operational-transformation";
import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { SQLStore } from "sql-store";
import initSQL from "sql.js";

export interface EditorContext {
  socket: Socket;
  client: EditorClient;
  store: SQLStore;
}
export const useEditorContext = () => {
  const result = useSuspenseQuery({
    queryKey: ["editor-context"],
    queryFn: init,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!isServer) {
      const socket = result.data?.socket;

      socket?.on("reload", () => {
        window.location.reload();
      });

      return () => {
        socket?.off("reload");
      };
    }
  }, [result.data?.socket]);

  return result.data;
};

const init = async () => {
  if (isServer) {
    throw new Error("useEditorContext cannot be used on the server side.");
  }
  // Fetch the database file and the revision number from the server.
  const url = `${process.env.NEXT_PUBLIC_WS_HOST}/database`;
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const u8Arr = new Uint8Array(arrayBuffer);
  const revision: number = u8Arr[0];
  const dbFileU8Arr = u8Arr.subarray(1);

  // Initialize Editor State.
  const socket = io(process.env.NEXT_PUBLIC_WS_HOST);
  const store = await initSQLStore(dbFileU8Arr);
  const client = new EditorClient(revision, store, socket);

  return { socket, client, store };
};

type Events = {
  applyServer: Operation;
  applyClient: Operation;
  serverAck: Operation;
};

export class EditorClient extends Client {
  sqlStore: SQLStore;
  socket: Socket;
  readonly emitter = mitt<Events>();

  constructor(revision: number, sqlStore: SQLStore, socket: Socket) {
    super(revision);
    this.sqlStore = sqlStore;
    this.socket = socket;

    socket.on("apply-server", (operation: Operation) => {
      this.applyServer(operation);
      this.emitter.emit("applyServer", operation);
    });

    socket.on("server-ack", (record: Record<string, string>) => {
      const op = identityRecordToOperation(record);
      this.applyOperation(op);
      this.serverAck(record);
      this.emitter.emit("serverAck", op);
    });
  }

  applyClient(operation: Operation): void {
    const result = this.applyOperation(operation);
    if (result.type === "success") {
      super.applyClient(operation);
      this.emitter.emit("applyClient", operation);
    } else {
      toast.error(`Failed to apply operation.`);
      console.error(result.err);
    }
  }

  sendOperation(revision: number, operation: Operation): void {
    this.socket.emit("send-operation", { revision, operation });
  }

  applyOperation(operation: Operation) {
    return this.sqlStore.execOperation(operation);
  }
}

const initSQLStore = async (dbFileU8Arr: Uint8Array) => {
  const sql = await initSQL({
    locateFile: (file: string) => `/${file}`,
  });
  const db = new sql.Database(dbFileU8Arr);
  return new SQLStore(db);
};

const identityRecordToOperation = (
  record: Record<string, string>
): Operation => {
  const keys = Object.keys(record);
  const values = Object.values(record);
  return {
    updateRecords: [
      {
        ids: keys.map((id) => ({ symbol: id })),
        columns: ["id"],
        values: values.map((id) => [id]),
      },
    ],
  };
};
