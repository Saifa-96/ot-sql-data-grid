import { Client, Operation } from "operational-transformation";
import { io, Socket } from "socket.io-client";
import { SQLStore } from "sql-store";
import initSQL from "sql.js";

export type EditorClientEvents = "apply-client" | "apply-server" | "server-ack";
export type EventCallback = (operation: Operation) => void;

class EditorClient extends Client {
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
    super.applyClient(operation);
    this.applyOperation(operation);

    // effect
    this.events["apply-client"]?.forEach((callback) => {
      callback(operation);
    });
  }

  sendOperation(revision: number, operation: Operation): void {
    this.socket.emit("send-operation", { revision, operation });
  }

  applyOperation(operation: Operation): void {
    this.sqlStore.execOperation(operation);
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

  static async initializeSQLStore(dbFileU8Arr: Uint8Array) {
    const sql = await initSQL({
      locateFile: (file: string) => `/${file}`,
    });
    const db = new sql.Database(dbFileU8Arr);
    return new SQLStore(db);
  }

  static initializeSocket(wsURL: string) {
    return io(wsURL);
  }
}

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

export default EditorClient;
