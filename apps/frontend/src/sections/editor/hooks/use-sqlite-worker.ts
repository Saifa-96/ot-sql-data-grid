import { useRef, useEffect, useMemo } from "react";
import { InitEventPayload } from "../sqlite-worker/payload-schema";

export const useSqliteWorker = () => {
  const workerRef = useRef<Worker>(null);
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("/src/sections/editor/sqlite-worker", import.meta.url)
    );
    workerRef.current.onmessage = (event) => {
      console.log(event);
    };
    workerRef.current.onerror = (error) => {
      console.error("Worker error:", error);
    };
    workerRef.current.postMessage({});
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return useMemo(
    () => ({
      initializeDB: (payload: InitEventPayload) => {
        workerRef.current?.postMessage(payload);
      },
    }),
    []
  );
};
