import { useRef, useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Client } from "../ot/client";
import { IdentityWithID, InsertCol, InsertRow, Operation, UpdateCell } from "../ot/operation/types";
import initSQL, { Database } from "sql.js";
import * as store from "../db/store";
import { columnSchema, Column } from "../schema";
import { getIDinIdentity, isClientSymbol, toIdentityWithID } from "../ot/operation/identity";
import { isString } from "lodash";

export class EditorClient extends Client {
  socket: Socket;
  db: Database;
  constructor(revision: number, socket: Socket, db: Database) {
    super(revision);
    this.socket = socket;
    this.db = db;
  }

  applyClient(operation: Operation): void {
    this.applyOperation(operation);
    super.applyClient(operation);
  }

  sendOperation(revision: number, operation: Operation): void {
    this.socket.emit("send-operation", { revision, operation });
  }

  applyOperation(operation: Operation): void {
    applyOperation(this.db, operation);
  }

  listenEvents(callback: VoidFunction) {
    console.log('listen');
    this.socket.on("apply-server", (payload) => {
      this.applyServer(payload);
      callback();
    });

    this.socket.on("server-ack", () => {
      this.serverAck();
      console.log('ack', this.state);
    });
  }

  stopListeningEvents() {
    console.log('stop listening');
    this.socket.off("apply-server");
    this.socket.off("server-ack");
  }

  static async new(socketURL: string) {
    const socket = io(socketURL);
    const [{ revision, dbFileU8Arr }, SQL] = await Promise.all([
      EditorClient.getDBFile(socket),
      EditorClient.initSQL(),
    ]);
    const db = new SQL.Database(dbFileU8Arr);
    return new EditorClient(revision, socket, db);
  }

  private static async getDBFile(socket: Socket) {
    socket.emit("init");
    return new Promise<{ revision: number; dbFileU8Arr: Uint8Array }>(
      (resolve) => {
        socket.once("init", (payload: ArrayBufferLike) => {
          const u8Arr = new Uint8Array(payload);
          const revision: number = u8Arr[0];
          const dbFileU8Arr = u8Arr.subarray(1);
          resolve({ revision, dbFileU8Arr });
        });
      }
    );
  }

  private static async initSQL() {
    const SQL = await initSQL({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    });
    return SQL;
  }

  getRowsByPage(page: number, size?: number) {
    return store.getUsersByPage(this.db, page, size);
  }

  getHeader(): Column[] {
    return store.getHeader(this.db).map((i) => {
      const obj = Object.fromEntries(i.entries());
      return columnSchema.parse(obj);
    });
  }
}

interface UseSocketIOParams {
  applyServerCallback: VoidFunction;
}

export const useSocketIO = (params: UseSocketIOParams) => {
  const { applyServerCallback } = params;
  const [client, setClient] = useState<EditorClient | null>(null);
  const initialized = useRef(false);
  const [header, setHeader] = useState<Column[]>([]);

  useEffect(() => {
    if (initialized.current) return;
    let c: EditorClient | null = null;
    const init = async () => {
      const newClient = await EditorClient.new("ws://localhost:3009");
      newClient.listenEvents(applyServerCallback);
      c = newClient;
      setHeader(newClient.getHeader());
      setClient(newClient);
    };
    initialized.current = true;
    init();

    return () => {
      c?.stopListeningEvents();
    };
  }, []);

  return {
    client,
    header,
  };
};

function applyOperation(db: Database, operation: Operation) {
  const newOp = { ...operation };
  const symbolMap: Map<string, string> = new Map();

  if (newOp.deleteRows) {
    const deleteIds = newOp.deleteRows.map(getIDinIdentity).filter(isString);
    store.deleteUsers(db, deleteIds);
  }

  // Apply deleteCols operation
  if (newOp.deleteCols) {
    const deleteIds = newOp.deleteCols.map(getIDinIdentity).filter(isString);
    store.deleteCols(db, deleteIds);
  }

  // Apply insertCols operation
  if (newOp.insertCols) {
    const insertCols = newOp.insertCols.map<InsertCol<IdentityWithID>>((i) => {
      if (isClientSymbol(i.id)) {
        const idStr = "" + new Date();
        symbolMap.set(i.id.symbol, idStr);
        const identity = toIdentityWithID(i.id, idStr);
        return { ...i, id: identity };
      } else {
        return i as InsertCol<IdentityWithID>;
      }
    });

    insertCols.forEach(({ id, colName }) => {
      store.insertColumn(db, id.id, colName);
    });
    newOp.insertCols = insertCols;
  }

  // Apply insertRows operation
  if (newOp.insertRows) {
    const insertRows = newOp.insertRows.map<InsertRow<IdentityWithID>>((i) => {
      if (isClientSymbol(i.id)) {
        const idStr = "" + new Date();
        symbolMap.set(i.id.symbol, idStr);
        const identity = toIdentityWithID(i.id, idStr);
        return {
          id: identity,
          data: i.data.map(({ colId, value }) => {
            if (isClientSymbol(colId)) {
              const colIdStr = symbolMap.get(colId.symbol);
              if (isString(colIdStr)) {
                return { colId: toIdentityWithID(colId, colIdStr), value };
              }
            }

            throw new Error("colId is not a string");
          }),
        };
      } else {
        return i as InsertRow<IdentityWithID>;
      }
    });
    newOp.insertRows = insertRows;

    insertRows.forEach(({ id, data }) => {
      const rowData = data.reduce((acc, { colId, value }) => {
        acc[colId.id] = value;
        return acc;
      }, {} as Record<string, unknown>);
      store.addUsers(db, [{ id: id.id, ...rowData }]);
    });
  }

  // Apply updateCells operation
  if (newOp.updateCells) {
    const updateCells = newOp.updateCells.map<UpdateCell<IdentityWithID>>(
      (i) => {
        const rowId = isClientSymbol(i.rowId)
          ? symbolMap.get(i.rowId.symbol)
          : getIDinIdentity(i.rowId);
        const colId = isClientSymbol(i.colId)
          ? symbolMap.get(i.colId.symbol)
          : getIDinIdentity(i.colId);

        if (isString(rowId) && isString(colId)) {
          return {
            rowId: { id: rowId, symbol: i.rowId.symbol },
            colId: { id: colId, symbol: i.colId.symbol },
            value: i.value,
          };
        }

        throw new Error("rowId or colId is not a string");
      }
    );
    updateCells.forEach(({ rowId, colId, value }) => {
      store.updateUserAttr(db, colId.id, rowId.id, value);
    });

    newOp.updateCells = updateCells;
  }

  return newOp;
}
