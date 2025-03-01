import { useEffect, useRef, useState } from "react";
import initSQL from "sql.js";
import SocketManager from "../state/socket-manager";
import { EditorClient } from "../state/editor-client";
import DBStore from "../state/store";

export interface EditorState {
  socketMgr: SocketManager;
  client: EditorClient;
  dbStore: DBStore;
}

export const useEditorState = () => {
  const [state, setState] = useState<EditorState | null>(null);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      // Create a new instance of the SocketManager for the WebSocket connection
      const socketMgr = new SocketManager(process.env.NEXT_PUBLIC_WS_HOST);

      // Get the revision and the database file from the server and initialize the SQL.js
      const [{ revision, dbFileU8Arr }, sql] = await Promise.all([
        socketMgr.getDBFile(),
        initSQL({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
        }),
      ]);

      // initialize the SQL.js database and the DBStore
      const db = new sql.Database(dbFileU8Arr);
      const dbStore = new DBStore(db);

      // Create a new instance of the EditorClient
      const client = new EditorClient({
        revision,
        events: {
          sendOperation(params) {
            socketMgr.sendOperation(params);
          },
          applyOperation(op) {
            dbStore.apply(op);
          },
        },
      });

      // Listen to the events from the SocketManager
      socketMgr.listenEvents({
        applyServer: (op) => client.applyServer(op),
        serverAck: (op) => client.serverAck(op),
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.resetDB = () => {
        socketMgr.resetDB();
      };

      setState({
        socketMgr,
        client,
        dbStore,
      });
    })();
  }, []);

  return state;
};
