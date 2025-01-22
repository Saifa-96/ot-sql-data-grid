import { Database } from "sql.js";
import {
  IdentityWithID,
  InsertCol,
  InsertRow,
  Operation,
  UpdateCell,
} from "./operation/types";
import { transform } from "./operation/utils";
import * as store from "../db/store";
import path from "node:path";
import {
  getIDinIdentity,
  isClientSymbol,
  toIdentityWithID,
} from "./operation/identity";
import { isString } from "lodash";
import { faker } from "@faker-js/faker";

export class Server {
  db: Database;
  operations: Operation[];

  constructor(db: Database) {
    this.db = db;
    this.operations = [];
  }

  static async new() {
    const filePath = path.join(__dirname, "../db/user.splite");
    const db = await store.initStoreDB(filePath);
    return new Server(db);
  }

  receiveOperation(revision: number, operation: Operation) {
    let curOp = operation;
    if (revision < 0 || this.operations.length < revision) {
      throw new Error("operation revision not in history");
    }

    const concurrentOperation = this.operations.slice(revision);
    for (const op of concurrentOperation) {
      const [op1] = transform(curOp, op);
      curOp = op1;
    }
    this.operations.push(curOp);
    const result = applyOperation(this.db, curOp);

    return result;
  }

  getRevision() {
    return this.operations.length + 1;
  }

  getDBUnit8Array() {
    return this.db.export();
  }
}

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
        const idStr = faker.string.uuid().slice(0, 7);
        symbolMap.set(i.id.symbol, idStr);
        const identity = toIdentityWithID(i.id, idStr);
        return { ...i, id: identity };
      } else {
        return i as InsertCol<IdentityWithID>;
      }
    });
    // const col: { type: string; name: string }[] = [];
    // insertCols.forEach(({ id, colName, index, type }) => {
    //   newDataGrid.header.splice(index, 0, {
    //     id: id.id,
    //     name: colName,
    //     width: 80,
    //   });
    //   col.push({ type, name: colName });
    // });
    // newDataGrid.data = newDataGrid.data.map((row) => {
    //   const newRow = { ...row };
    //   col.forEach(({ name }) => {
    //     newRow[name] = "";
    //   });
    //   return newRow;
    // });
    insertCols.forEach(({ id, colName }) => {
      store.insertColumn(db, id.id, colName);
    });
    newOp.insertCols = insertCols;
  }

  // Apply insertRows operation
  if (newOp.insertRows) {
    const insertRows = newOp.insertRows.map<InsertRow<IdentityWithID>>((i) => {
      if (isClientSymbol(i.id)) {
        const idStr = faker.string.uuid().slice(0, 7);
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

      // newDataGrid.data.unshift({
      //   id: id.id,
      //   ...rowData,
      // });
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
