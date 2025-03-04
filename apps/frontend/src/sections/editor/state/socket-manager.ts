import { Operation, UUID } from "operational-transformation";
import { io, Socket } from "socket.io-client";

export interface ListEvents {
  applyServer(operation: Operation): void;
  serverAck(operation: Operation<UUID>): void;
  allOperations(operations: Operation<UUID>[]): void;
  connectionCount(count: number): void;
}

class SocketManager {
  socket: Socket;
  constructor(wsURL: string) {
    this.socket = io(wsURL);
    this.socket.on("reload", () => {
      window.location.reload();
    });
  }

  sendOperation(params: { revision: number; operation: Operation }) {
    this.socket.emit("send-operation", params);
  }

  getDBFile() {
    this.socket.emit("init");
    return new Promise<{ revision: number; dbFileU8Arr: Uint8Array }>(
      (resolve) => {
        this.socket.once("init", (payload: ArrayBufferLike) => {
          const u8Arr = new Uint8Array(payload);
          const revision: number = u8Arr[0];
          const dbFileU8Arr = u8Arr.subarray(1);
          resolve({ revision, dbFileU8Arr });
        });
      }
    );
  }

  listenEvents(event: Partial<ListEvents>) {
    const { applyServer, serverAck, allOperations } = event;
    if (applyServer) {
      this.socket.on("apply-server", applyServer);
    }
    if (serverAck) {
      this.socket.on("server-ack", serverAck);
    }
    if (allOperations) {
      this.socket.on("all-operations", allOperations);
    }
    if (event.connectionCount) {
      this.socket.on("connection-count", event.connectionCount);
    }
  }

  stopListeningEvents() {
    this.socket.offAny();
  }

  offListenEvents(event: Partial<ListEvents>) {
    if (event.applyServer) {
      this.socket.off("apply-server", event.applyServer);
    }
    if (event.serverAck) {
      this.socket.off("server-ack", event.serverAck);
    }
    if (event.allOperations) {
      this.socket.off("all-operations", event.allOperations);
    }
    if (event.connectionCount) {
      this.socket.off("connection-count", event.connectionCount);
    }
  }

  resetDB() {
    this.socket.emit("reset");
  }

  getAllOperations() {
    this.socket.emit("get-all-operations");
  }

  getClientCount() {
    this.socket.emit("get-connection-count");
  }
}

export default SocketManager;
