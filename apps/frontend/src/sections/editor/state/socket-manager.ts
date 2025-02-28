"use client";

import { useMemo } from "react";
import { atom, useAtomValue } from "jotai";
import { Operation } from "operational-transformation";
import { io } from "socket.io-client";

const socketAtom = atom(io(process.env.NEXT_PUBLIC_WS_HOST));

export const useSocketIO = () => {
  const socket = useAtomValue(socketAtom);
  const methods = useMemo(
    () => ({
      sendOperation(params: { revision: number; operation: Operation }) {
        socket.emit("send-operation", params);
      },
      getDBFile() {
        socket.emit("init");
        return new Promise((resolve) => {
          socket.once("init", (payload: ArrayBufferLike) => {
            const u8Arr = new Uint8Array(payload);
            const revision: number = u8Arr[0];
            const dbFileU8Arr = u8Arr.subarray(1);
            resolve({ revision, dbFileU8Arr });
          });
        });
      },
      listenEvents(event: Partial<ListEvents>) {
        const { applyServer, serverAck } = event;
        if (applyServer) {
          socket.on("apply-server", applyServer);
        }
        if (serverAck) {
          socket.on("server-ack", serverAck);
        }
      },
      stopListeningEvents() {
        socket.offAny();
      },
    }),
    [socket]
  );

  return methods;
};

export interface ListEvents {
  applyServer(operation: Operation): void;
  serverAck(operation: Operation): void;
}
