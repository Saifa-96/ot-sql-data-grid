import initSQL from "sql.js";
// import * as store from "./db/store";
import path from "node:path";
import { isString } from "lodash";
import { faker } from "@faker-js/faker";
import {
  getUUIDinIdentity,
  UUID,
  Operation,
  Server,
  isClientSymbol,
  UpdateCell,
  mapClientSymbolToUUID,
  identityToString,
} from "operational-transformation";
import SQLStore from "sql-store";
import fs from "node:fs";
import { genData, genHeader } from "./faker-data";

export class OTServer extends Server {
  // db: Database;
  sqlStore: SQLStore;
  operations: Operation[];

  constructor(sqlStore: SQLStore) {
    super();
    this.sqlStore = sqlStore;
    // this.db = db;
    this.operations = [];
  }

  static async new() {
    try {
      const filePath = path.join(__dirname, "./user.sqlite");
      const filebuffer = fs.readFileSync(filePath);
      const sql = await initSQL();
      const db = new sql.Database(filebuffer);
      const sqlStore = new SQLStore(db);
      const header = genHeader();
      sqlStore.init(header);
      const headerStr = ["id", ...header.map((h) => h.name)];
      sqlStore.addRows(
        headerStr,
        genData().map((row) => headerStr.map((h) => row[h as keyof typeof row]))
      );
      return new OTServer(sqlStore);
    } catch (err) {
      console.log(err);
    }
  }

  consumeClientSymbols(operation: Operation): Operation<UUID> {
    const map = new Map<string, string>();
    return mapClientSymbolToUUID(operation, ({ symbol }) => {
      let uuid: string;
      if (map.has(symbol)) {
        uuid = map.get(symbol) as string;
      } else {
        uuid = faker.string.uuid();
        map.set(symbol, uuid);
      }
      return { uuid, symbol };
    });
  }

  applyOperation(operation: Operation): Operation {
    const newOp = applyOperation(this.sqlStore, operation);
    this.operations.push(newOp);
    return newOp;
  }

  toBuffer() {
    const dbU8Arr = this.sqlStore.export();
    const revision = this.getRevision();
    return new Uint8Array([revision, ...dbU8Arr]);
  }
}

function applyOperation(sqlStore: SQLStore, operation: Operation) {
  const newOp = { ...operation };
  const symbolMap: Map<string, string> = new Map();

  if (newOp.deleteRows) {
    const deleteIds = newOp.deleteRows.map(getUUIDinIdentity).filter(isString);
    // store.deleteUsers(db, deleteIds);
    sqlStore.deleteRows(deleteIds);
  }

  // Apply deleteCols operation
  if (newOp.deleteCols) {
    const deleteIds = newOp.deleteCols.map(getUUIDinIdentity).filter(isString);
    // store.deleteCols(db, deleteIds);
    deleteIds.forEach(sqlStore.delColumn);
  }

  // Apply insertCols operation
  if (newOp.insertCols) {
    newOp.insertCols.forEach(
      ({ id, name, displayName, width, orderBy, type }) => {
        // store.insertColumn(db, identityToString(id), colName);
        sqlStore.addColumn({
          id: identityToString(id),
          name,
          displayName,
          width,
          orderBy,
          type,
        });
      }
    );
    // newOp.insertCols = insertCols;
  }

  // Apply insertRows operation
  if (newOp.insertRows) {
    // newOp.insertRows.forEach(({ id, data }) => {
    //   const rowData = data.reduce((acc, { colId, value }) => {
    //     acc[identityToString(colId)] = value;
    //     return acc;
    //   }, {} as Record<string, unknown>);
    //   // console.log([{ id: identityToString(id), ...rowData }]);
    //   const headerArr = sqlStore.getHeader().map((i) => i.name);
    //   sqlStore.addRows(headerArr, [{ id: identityToString(id), ...rowData }]);
    //   // store.addUsers(db, [{ id: identityToString(id), ...rowData }]);
    // });
    const headerArr = sqlStore.getHeader().map((i) => i.name);
    sqlStore.addRows(
      ["id", ...headerArr],
      newOp.insertRows.map(({ id, data }) => {
        return [
          identityToString(id),
          ...headerArr.map(
            (i) =>
              data.find((item) => identityToString(item.colId) === i)?.value ??
              null
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
        : getUUIDinIdentity(i.rowId);
      const colId = isClientSymbol(i.colId)
        ? symbolMap.get(i.colId.symbol)
        : getUUIDinIdentity(i.colId);

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
