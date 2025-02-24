import { io, Socket } from "socket.io-client";
import {
  Client,
  Operation,
  isClientSymbol,
  UpdateCell,
  UUID,
  getUUIDinIdentity,
  identityToString,
} from "operational-transformation";
import initSQL from "sql.js";
import SQLStore from "sql-store";
import { isString } from "lodash";

export class EditorClient extends Client {
  socket: Socket;
  sqlStore: SQLStore;

  constructor(revision: number, socket: Socket, sqlStore: SQLStore) {
    super(revision);
    this.socket = socket;
    this.sqlStore = sqlStore;
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
    applyOperation(this.sqlStore, operation);
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
    const [{ revision, dbFileU8Arr }, sql] = await Promise.all([
      EditorClient.getDBFile(socket),
      initSQL({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      }),
    ]);
    const db = new sql.Database(dbFileU8Arr);
    const sqlStore = new SQLStore(db);
    return new EditorClient(revision, socket, sqlStore);
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

  getRowsByPage(page: number, size: number = 50) {
    return this.sqlStore
      .getRowsByPage(page, size, "create_time DESC")
      .map((item) => new Map(Object.entries(item)));
  }

  getHeader() {
    // return store.getHeader(this.db).map((i) => {
    //   const obj = Object.fromEntries(i.entries());
    //   return columnSchema.parse(obj);
    // });
    return this.sqlStore.getHeader();
  }

  getTotalCount() {
    return this.sqlStore.getTotalCount();
  }
}

/**
 * Apply operation to the database of Sql.js
 */
function applyOperation(sqlStore: SQLStore, operation: Operation) {
  const newOp = { ...operation };
  const symbolMap: Map<string, string> = new Map();

  if (newOp.deleteRows) {
    const deleteIds = newOp.deleteRows.map(getUUIDinIdentity).filter(isString);
    sqlStore.deleteRows(deleteIds);
  }

  // Apply deleteCols operation
  if (newOp.deleteCols) {
    const deleteIds = newOp.deleteCols.map(getUUIDinIdentity).filter(isString);
    deleteIds.forEach(sqlStore.delColumn);
  }

  // Apply insertCols operation
  if (newOp.insertCols) {
    // const insertCols = newOp.insertCols.map<InsertCol>((i) => {
    //   if (isClientSymbol(i.id)) {
    //     const idStr = "" + new Date();
    //     symbolMap.set(i.id.symbol, idStr);
    //     // const identity = toIdentityWithID(i.id, idStr);
    //     const identity = { ...i.id, uuid: idStr };
    //     return { ...i, id: identity };
    //   } else {
    //     return i as InsertCol;
    //   }
    // });

    newOp.insertCols.forEach(({ id, name, displayName, orderBy }) => {
      // store.insertColumn(db, id.uuid, colName);
      // sqlStore.addColumn(colName);
      sqlStore.addColumn({
        id: identityToString(id),
        name,
        orderBy,
        width: 200,
        displayName,
        type: "TEXT",
      });
    });
    // newOp.insertCols = insertCols;
  }

  // Apply insertRows operation
  if (newOp.insertRows) {
    const header = sqlStore.getHeader();
    const headerStr = header.map((i) => i.name);
    // newOp.insertRows.forEach(({ id, data }) => {
    //   const rowData = data.reduce((acc, { colId, value }) => {
    //     acc[identityToString(colId)] = value;
    //     return acc;
    //   }, {} as Record<string, unknown>);
    //   console.log(
    //     ["id", ...headerStr],
    //     [{ id: identityToString(id), ...rowData }]
    //   );

    //   sqlStore.addRows(
    //     ["id", ...headerStr],
    //     [{ id: identityToString(id), ...rowData }]
    //   );
    //   // store.addUsers(db, [{ id: identityToString(id), ...rowData }]);
    // });
    sqlStore.addRows(
      ["id", ...headerStr],
      newOp.insertRows.map(({ id, data }) => {
        return [
          identityToString(id),
          ...headerStr.map(
            (i) => data.find((item) => identityToString(item.colId)=== i)?.value ?? null
          ),
        ];
      }) as (string | null)[][]
    );
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
      // store.updateUserAttr(db, colId.uuid, rowId.uuid, value);
      sqlStore.updateCell(rowId.uuid, colId.uuid, value);
    });

    newOp.updateCells = updateCells;
  }

  return newOp;
}
