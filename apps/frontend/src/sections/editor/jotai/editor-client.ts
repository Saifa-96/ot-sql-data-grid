import { io, Socket } from "socket.io-client";
import initSQL, { Database } from "sql.js";
import * as store from "../db/store";
import { columnSchema, Column } from "./schema";
import {
  Client,
  Operation,
  InsertCol,
  isClientSymbol,
  UpdateCell,
  UUID,
  getUUIDinIdentity,
  identityToString,
} from "operational-transformation";
import { isString } from "lodash";

export class EditorClient extends Client {
  socket: Socket;
  db: Database;

  constructor(revision: number, socket: Socket, db: Database) {
    super(revision);
    this.socket = socket;
    this.db = db;
  }

  applyServerAck(_: Operation, processedOperation: Operation<UUID>): void {
    if (processedOperation.insertRows) {
      const updateCells = processedOperation.insertRows
        .filter((item) => !!item.id.symbol)
        .map<UpdateCell>((item) => {
          return {
            colId: { uuid: "id" },
            rowId: { uuid: item.id.symbol! },
            value: item.id.uuid,
          };
        });
      console.log("apply server ack: ", updateCells);
      this.applyOperation({ updateCells });
    }
  }

  applyClient(operation: Operation): void {
    console.log("apply client", operation);
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
    this.socket.on("apply-server", (payload) => {
      this.applyServer(payload);
      callback();
    });

    this.socket.on("server-ack", (operation: Operation<UUID>) => {
      this.serverAck(operation);
      callback();
    });
  }

  stopListeningEvents() {
    console.log("stop listening");
    this.socket.off("apply-server");
    this.socket.off("server-ack");
  }

  static async new(wsURL: string) {
    const socket = io(wsURL);
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

  getUserTotalCount() {
    return store.getUserCount(this.db);
  }
}

/**
 * Apply operation to the database of Sql.js
 */
function applyOperation(db: Database, operation: Operation) {
  const newOp = { ...operation };
  const symbolMap: Map<string, string> = new Map();

  if (newOp.deleteRows) {
    const deleteIds = newOp.deleteRows.map(getUUIDinIdentity).filter(isString);
    store.deleteUsers(db, deleteIds);
  }

  // Apply deleteCols operation
  if (newOp.deleteCols) {
    const deleteIds = newOp.deleteCols.map(getUUIDinIdentity).filter(isString);
    store.deleteCols(db, deleteIds);
  }

  // Apply insertCols operation
  if (newOp.insertCols) {
    const insertCols = newOp.insertCols.map<InsertCol<UUID>>((i) => {
      if (isClientSymbol(i.id)) {
        const idStr = "" + new Date();
        symbolMap.set(i.id.symbol, idStr);
        // const identity = toIdentityWithID(i.id, idStr);
        const identity = { ...i.id, uuid: idStr };
        return { ...i, id: identity };
      } else {
        return i as InsertCol<UUID>;
      }
    });

    insertCols.forEach(({ id, colName }) => {
      store.insertColumn(db, id.uuid, colName);
    });
    newOp.insertCols = insertCols;
  }

  // Apply insertRows operation
  if (newOp.insertRows) {
    newOp.insertRows.forEach(({ id, data }) => {
      const rowData = data.reduce((acc, { colId, value }) => {
        acc[identityToString(colId)] = value;
        return acc;
      }, {} as Record<string, unknown>);
      store.addUsers(db, [{ id: identityToString(id), ...rowData }]);
    });
  }

  // Apply updateCells operation
  if (newOp.updateCells) {
    const updateCells = newOp.updateCells.map<UpdateCell<UUID>>((i) => {
      const rowId = isClientSymbol(i.rowId)
        ? symbolMap.get(i.rowId.symbol)
        : identityToString(i.rowId);
      const colId = isClientSymbol(i.colId)
        ? symbolMap.get(i.colId.symbol)
        : identityToString(i.colId);

      if (isString(rowId) && isString(colId)) {
        return {
          rowId: { uuid: rowId, symbol: i.rowId.symbol },
          colId: { uuid: colId, symbol: i.colId.symbol },
          value: i.value,
        };
      }

      throw new Error("rowId or colId is not a string");
    });
    updateCells.forEach(({ rowId, colId, value }) => {
      store.updateUserAttr(db, colId.uuid, rowId.uuid, value);
    });

    newOp.updateCells = updateCells;
  }

  return newOp;
}
