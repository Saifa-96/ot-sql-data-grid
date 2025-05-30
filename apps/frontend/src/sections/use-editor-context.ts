"use client";
import { isServer, useSuspenseQuery } from "@tanstack/react-query";
import { Client, Operation } from "operational-transformation";
import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { SQLStore } from "sql-store";
import initSQL from "sql.js";

export type EditorClientEvents = "apply-client" | "apply-server" | "server-ack";
export type EventCallback = (operation: Operation) => void;
export interface EditorState {
  socket: Socket;
  client: EditorClient;
  store: SQLStore;
}
export const useEditorContext = () => {
  const result = useSuspenseQuery({
    queryKey: ["editor-context"],
    queryFn: init,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isServer) {
      const socket = result.data?.socket;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.resetDB = () => {
        socket?.emit("reset");
      };
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
  if (isServer) return createMockEditorState();

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

const createMockEditorState = (): EditorState => {
  const mockSocket: Socket = {
    on: () => mockSocket,
    off: () => mockSocket,
    emit: () => false,
    connect: () => mockSocket,
  } as unknown as Socket;

  const mockStore = {
    execOperation: () => ({ type: "success" as const }),
    getColumns: () => [],
    getRecordsByPage: () => [],
  } as unknown as SQLStore;

  const mockClient = new EditorClient(0, mockStore, mockSocket);

  return { socket: mockSocket, client: mockClient, store: mockStore };
};

export class EditorClient extends Client {
  sqlStore: SQLStore;
  socket: Socket;
  private events: Record<string, EventCallback[]> = {};

  constructor(revision: number, sqlStore: SQLStore, socket: Socket) {
    super(revision);
    this.sqlStore = sqlStore;
    this.socket = socket;

    socket.on("apply-server", (operation: Operation) => {
      this.applyServer(operation);

      // effect
      this.events["apply-server"]?.forEach((callback) => {
        callback(operation);
      });
    });

    socket.on("server-ack", (record: Record<string, string>) => {
      const op = identityRecordToOperation(record);
      this.applyOperation(op);
      this.serverAck(record);

      // effect
      this.events["server-ack"]?.forEach((callback) => {
        callback(op);
      });
    });
  }

  applyClient(operation: Operation): void {
    const result = this.applyOperation(operation);
    if (result.type === "success") {
      super.applyClient(operation);
      // effect
      this.events["apply-client"]?.forEach((callback) => {
        callback(operation);
      });
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

  subscribeToEvent(event: EditorClientEvents, callback: EventCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  unsubscribeFromEvent(
    event: EditorClientEvents,
    callback: EventCallback
  ): void {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
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
