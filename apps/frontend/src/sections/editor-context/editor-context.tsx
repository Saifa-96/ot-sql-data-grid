"use client";

import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import EditorClient from "./editor-client";
import { Socket } from "socket.io-client";
import { SQLStore } from "sql-store";

export interface EditorState {
  socket: Socket;
  client: EditorClient;
  store: SQLStore;
}

const EditorContext = createContext<EditorState | null>(null);

export const useEditorContext = () => useContext(EditorContext);

export const EditorContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<EditorState | null>(null);

  const initializing = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || initializing.current) return;
    let socket: Socket;
    let store: SQLStore;

    const init = async () => {
      initializing.current = true;

      // Fetch the database file and the revision number from the server.
      const res = await fetch(process.env.NEXT_PUBLIC_WS_HOST + "/database");
      const arrayBuffer = await res.arrayBuffer();
      const u8Arr = new Uint8Array(arrayBuffer);
      const revision: number = u8Arr[0];
      const dbFileU8Arr = u8Arr.subarray(1);

      // Initialize Editor State.
      socket = EditorClient.initializeSocket(process.env.NEXT_PUBLIC_WS_HOST);
      store = await EditorClient.initializeSQLStore(dbFileU8Arr);
      const client = new EditorClient(revision, store, socket);
      setState({ socket, client, store });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.resetDB = () => {
        socket.emit("reset");
      };
      socket.on("reload", () => {
        window.location.reload();
      });

      initializing.current = false;
    };

    init();
    return () => {
      socket?.offAny();
      socket?.disconnect();
      store?.db.close();
    };
  }, []);

  return (
    <EditorContext.Provider value={state}>{children}</EditorContext.Provider>
  );
};
