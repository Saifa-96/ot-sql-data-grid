import { isString } from "lodash";
import { Column, DataItem, genData, genHeader } from "../faker-data";
import {
  getIDinIdentity,
  isClientSymbol,
  toIdentityWithID,
} from "./operation/identity";
import { faker } from "@faker-js/faker";
import * as OT from "./operation/types";

export interface DataGrid {
  header: Column[];
  data: DataItem[];
  revision: number;
}

export function getDefaultDataGrid(): DataGrid {
  const data = Array(4).fill(null).map(genData).flat();
  const header = genHeader();
  return {
    revision: 0,
    data,
    header,
  };
}

export function getRowsByPage(
  dataGrid: DataGrid,
  page: number,
  size: number = 100
) {
  return dataGrid.data.slice(page - 1, size);
}

export function applyOperation(dataGrid: DataGrid, operation: OT.Operation) {
  const newOp = { ...operation };
  const newDataGrid = { ...dataGrid };
  const symbolMap: Map<string, string> = new Map();

  if (newOp.deleteRows) {
    const deleteIds = newOp.deleteRows.map(getIDinIdentity).filter(isString);
    newDataGrid.data.filter((row) => {
      const rowId = row["id"];
      return !deleteIds.includes(rowId);
    });
  }

  // Apply deleteCols operation
  if (newOp.deleteCols) {
    const deleteIds = newOp.deleteCols.map(getIDinIdentity).filter(isString);
    newDataGrid.header = newDataGrid.header.filter(
      (col) => !deleteIds.includes(col.id)
    );
    newDataGrid.data.forEach((row) => {
      deleteIds.forEach((id) => {
        delete row[id];
      });
    });
  }

  // Apply insertCols operation
  if (newOp.insertCols) {
    const insertCols = newOp.insertCols.map<OT.InsertCol<OT.IdentityWithID>>(
      (i) => {
        if (isClientSymbol(i.id)) {
          const idStr = faker.string.uuid().slice(0, 7);
          symbolMap.set(i.id.symbol, idStr);
          const identity = toIdentityWithID(i.id, idStr);
          return { ...i, id: identity };
        } else {
          return i as OT.InsertCol<OT.IdentityWithID>;
        }
      }
    );
    const col: { type: string; name: string }[] = [];
    insertCols.forEach(({ id, colName, index, type }) => {
      newDataGrid.header.splice(index, 0, {
        id: id.id,
        name: colName,
        width: 80,
      });
      col.push({ type, name: colName });
    });
    newDataGrid.data = newDataGrid.data.map((row) => {
      const newRow = { ...row };
      col.forEach(({ name }) => {
        newRow[name] = "";
      });
      return newRow;
    });
    newOp.insertCols = insertCols;
  }

  // Apply insertRows operation
  if (newOp.insertRows) {
    const insertRows = newOp.insertRows.map<OT.InsertRow<OT.IdentityWithID>>(
      (i) => {
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
          return i as OT.InsertRow<OT.IdentityWithID>;
        }
      }
    );
    newOp.insertRows = insertRows;

    insertRows.forEach(({ id, data }) => {
      const rowData = data.reduce((acc, { colId, value }) => {
        acc[colId.id] = value as string;
        return acc;
      }, {} as DataItem);
      newDataGrid.data.unshift({
        id: id.id,
        ...rowData,
      });
    });
  }

  // Apply updateCells operation
  if (newOp.updateCells) {
    const updateCells = newOp.updateCells.map<OT.UpdateCell<OT.IdentityWithID>>(
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
      const row = newDataGrid.data.find((row) => row.id === rowId.id);
      if (row) {
        row[colId.id] = value;
      }
    });

    newOp.updateCells = updateCells;
  }

  return {
    dataGrid: newDataGrid,
    operation: newOp,
  };
}
