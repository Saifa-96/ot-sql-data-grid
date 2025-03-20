import initSQL from "sql.js";
import { isString } from "is-what";
import { faker } from "@faker-js/faker";
import {
  getUUIDfromIdentity,
  UUID,
  Operation,
  Server,
  isClientSymbol,
  UpdateCell,
  mapClientSymbolToUUID,
  identityToString,
} from "operational-transformation";
import SQLStore from "sql-store";
import { genData, genHeader } from "./faker-data";

export class OTServer extends Server {
  sqlStore: SQLStore;

  constructor(sqlStore: SQLStore) {
    super();
    this.sqlStore = sqlStore;
  }

  static async new() {
    try {
      const sql = await initSQL();
      const db = new sql.Database();
      const sqlStore = new SQLStore(db);
      const header = genHeader();
      sqlStore.init(header);
      const headerStr = ["id", ...header.map((h) => h.fieldName)];
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
    const deleteIds = newOp.deleteRows
      .map(getUUIDfromIdentity)
      .filter(isString);
    sqlStore.deleteRows(deleteIds);
  }

  // Apply deleteCols operation
  if (newOp.deleteCols) {
    const deleteIds = newOp.deleteCols
      .map(getUUIDfromIdentity)
      .filter(isString);
    deleteIds.forEach((name) => sqlStore.delColumn(name));
  }

  // Apply insertCols operation
  if (newOp.insertCols) {
    newOp.insertCols.forEach(
      ({ id, name, displayName, width, orderBy, type }) => {
        sqlStore.addColumn({
          id: identityToString(id),
          fieldName: name,
          displayName,
          width,
          orderBy,
          type,
        });
      }
    );
  }

  // Apply insertRows operation
  if (newOp.insertRows) {
    const headerArr = sqlStore.getHeader().map((i) => i.fieldName);
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
        : getUUIDfromIdentity(i.rowId);
      const colId = isClientSymbol(i.colId)
        ? symbolMap.get(i.colId.symbol)
        : getUUIDfromIdentity(i.colId);

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
      sqlStore.updateCell(rowId.uuid, colId.uuid, value);
    });

    newOp.updateCells = updateCells;
  }

  return newOp;
}
