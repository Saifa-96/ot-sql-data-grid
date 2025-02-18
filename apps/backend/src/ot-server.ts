import { Database } from "sql.js";
import * as store from "./db/store";
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

export class OTServer extends Server {
  db: Database;
  operations: Operation[];

  constructor(db: Database) {
    super();
    this.db = db;
    this.operations = [];
  }

  static async new() {
    const filePath = path.join(__dirname, "./db/user.sqlite");
    const db = await store.initStoreDB(filePath);
    return new OTServer(db);
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
    const newOp = applyOperation(this.db, operation);
    this.operations.push(newOp);
    return newOp;
  }

  toBuffer() {
    const dbU8Arr = this.db.export();
    const revision = this.getRevision();
    return new Uint8Array([revision, ...dbU8Arr]);
  }
}

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
    newOp.insertCols.forEach(({ id, colName }) => {
      store.insertColumn(db, identityToString(id), colName);
    });
    // newOp.insertCols = insertCols;
  }

  // Apply insertRows operation
  if (newOp.insertRows) {
    newOp.insertRows.forEach(({ id, data }) => {
      const rowData = data.reduce((acc, { colId, value }) => {
        acc[identityToString(colId)] = value;
        return acc;
      }, {} as Record<string, unknown>);
      console.log([{ id: identityToString(id), ...rowData }]);
      store.addUsers(db, [{ id: identityToString(id), ...rowData }]);
    });
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
      store.updateUserAttr(db, colId.uuid, rowId.uuid, value);
    });

    newOp.updateCells = updateCells;
  }

  return newOp;
}
