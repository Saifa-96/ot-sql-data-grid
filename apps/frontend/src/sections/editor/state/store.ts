import SQLStore from "sql-store";
import { Database } from "sql.js";
import {
  getUUIDfromIdentity,
  identityToString,
  isClientSymbol,
  Operation,
  UpdateCell,
  UUID,
} from "operational-transformation";
import { isString } from "lodash";

class DBStore extends SQLStore {
  constructor(db: Database) {
    super(db);
  }

  getRowsByPage(page: number, size: number = 50) {
    return super
      .getRowsByPage(page, size, "create_time DESC")
      .map((item) => new Map(Object.entries(item)));
  }

  apply(operation: Operation) {
    return applyOperation(this, operation);
  }
}

export default DBStore;

/**
 * Apply operation to the database of Sql.js
 */
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
    deleteIds.forEach((id) => sqlStore.delColumn(id));
  }

  // Apply insertCols operation
  if (newOp.insertCols) {
    newOp.insertCols.forEach(({ id, name, displayName, orderBy }) => {
      sqlStore.addColumn({
        id: identityToString(id),
        fieldName: name,
        orderBy,
        width: 200,
        displayName,
        type: "TEXT",
      });
    });
  }

  // Apply insertRows operation
  if (newOp.insertRows) {
    const header = sqlStore.getHeader();
    const headerStr = header.map((i) => i.fieldName);
    sqlStore.addRows(
      ["id", ...headerStr],
      newOp.insertRows.map(({ id, data }) => {
        return [
          identityToString(id),
          ...headerStr.map(
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
      sqlStore.updateCell(rowId.uuid, colId.uuid, value);
    });

    newOp.updateCells = updateCells;
  }

  return newOp;
}
