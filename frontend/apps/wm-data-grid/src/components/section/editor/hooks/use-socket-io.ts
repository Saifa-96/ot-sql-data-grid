import { useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { z } from "zod";
import { Client } from "../ot/client";
import { Operation } from "../ot/operation/types";

export const useSocketIO = () => {
  const curPageRef = useRef(1);

  const { socket, client } = useMemo(() => {
    const socket = io("ws://localhost:3009");
    class EditorClient extends Client {
      sendOperation(revision: number, operation: Operation): void {}

      applyOperation(operation: Operation): void {
        
      }

      setRevision(revision: number) {
        this.revision = revision;
      }
    }
    return { socket, client: new EditorClient(0) };
  }, []);

  const cache = useRef<Map<string, Promise<unknown>>>(new Map());
  const request = useCallback(
    (msg: string, payload?: unknown): Promise<unknown> => {
      const waitingPromise = cache.current.get(msg);
      if (waitingPromise !== undefined) return waitingPromise;

      const p = new Promise((resolve) => {
        socket.emit(msg, payload);
        socket.on(msg, (data) => {
          cache.current.delete(msg);
          resolve(data);
        });
      });

      cache.current.set(msg, p);
      return p;
    },
    [socket]
  );

  const init = useCallback(async () => {
    const result = await request("init").then(initialDataSchema.safeParse);
    if (result.success) {
      const { revision } = result.data;
      client.setRevision(revision);
    }
    return result;
  }, [client, request]);

  const nextPage = useCallback(async () => {
    const page = curPageRef.current + 1;
    const result = await request("next-page", { page }).then(
      pageSchema.safeParse
    );
    if (result.success) {
      curPageRef.current++;
    }
    return result;
  }, [request]);

  return { init, nextPage };
};

export const cellDataSchema = z.object({
  row_index: z.number(),
  col_index: z.number(),
  row: z.map(z.string(), z.string()).nullable(),
  col: z.object({
    name: z.string(),
    width: z.number(),
  }),
  x: z.number(),
  y: z.number(),
});

const initialDataSchema = z.object({
  revision: z.number(),
  header: z
    .array(
      z.object({
        name: z.string(),
        width: z.number(),
      })
    )
    .default([{ name: "empty", width: 120 }]),
  rows: z.array(z.record(z.string(), z.string())).default([]),
  total: z.number().default(0),
});

const pageSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).default([]),
  total: z.number().default(0),
});
