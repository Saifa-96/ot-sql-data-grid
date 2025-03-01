import { Operation, UUID } from "operational-transformation";
import { io, Socket } from "socket.io-client";

export interface ListEvents {
  applyServer(operation: Operation): void;
  serverAck(operation: Operation<UUID>): void;
}

class SocketManager {
  socket: Socket;
  constructor(wsURL: string) {
    this.socket = io(wsURL);
    this.socket.on('reload', () => {
      window.location.reload();
    })
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
    const { applyServer, serverAck } = event;
    if (applyServer) {
      this.socket.on("apply-server", applyServer);
    }
    if (serverAck) {
      this.socket.on("server-ack", serverAck);
    }
  }

  stopListeningEvents() {
    this.socket.offAny();
  }

  offListenEvents(event: Partial<ListEvents>) {
    this.socket.off("apply-server", event.applyServer);
    this.socket.off("server-ack", event.serverAck);
  }

  resetDB () {
    this.socket.emit('reset');
  }
}

export default SocketManager;
