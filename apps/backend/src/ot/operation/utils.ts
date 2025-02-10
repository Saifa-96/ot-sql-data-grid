import { concat, differenceWith, union, unionWith } from "lodash";
import * as OT from "./types";
import { fillOperation, isIdentityEqual, strip } from "./identity";

// apply(apply(S, A), B) = apply(S, compose(A, B))
export function compose(op1: OT.Operation, op2: OT.Operation): OT.Operation {
  const op1Filled = fillOperation(op1);
  const op2Filled = fillOperation(op2);
  const operation = fillOperation();

  operation.deleteRows = union(op2Filled.deleteRows, op1Filled.deleteRows);
  operation.deleteCols = union(op2Filled.deleteCols, op1Filled.deleteCols);

  operation.insertRows = differenceWith(
    concat(op2Filled.insertRows, op1Filled.insertRows),
    operation.deleteRows,
    ({ id }, delId) => isIdentityEqual(id, delId)
  );

  operation.insertCols = differenceWith(
    concat(op2Filled.insertCols, op1Filled.insertCols),
    operation.deleteCols,
    ({ id }, delId) => isIdentityEqual(id, delId)
  );

  const cellChanges = unionWith(
    op2Filled.updateCells,
    op1Filled.updateCells,
    (cell2, cell1) =>
      isIdentityEqual(cell2.colId, cell1.colId) &&
      isIdentityEqual(cell2.rowId, cell1.rowId)
  ).filter((change) => {
    return !(
      operation.deleteRows.some((id) => isIdentityEqual(id, change.rowId)) ||
      operation.deleteCols.some((id) => isIdentityEqual(id, change.colId))
    );
  });

  const [updateCells, insertRows] = consumeUpdateCells(
    cellChanges,
    operation.insertRows
  );
  operation.updateCells = updateCells;
  operation.insertRows = insertRows;

  return strip(operation);
}

function consumeUpdateCells(
  updateCells: OT.UpdateCell[],
  insertRows: OT.InsertRow[]
): [OT.UpdateCell[], OT.InsertRow[]] {
  let rowChanges: OT.InsertRow[] = [...insertRows];
  let cellChanges: OT.UpdateCell[] = [];
  for (const change of updateCells) {
    const rowChangeIndex = insertRows.findIndex(({ id }) =>
      isIdentityEqual(id, change.rowId)
    );

    if (rowChangeIndex === -1) {
      cellChanges.push(change);
    } else {
      const rowChange = insertRows[rowChangeIndex];
      rowChanges[rowChangeIndex] = {
        ...rowChange,
        data: rowChange.data.map((cellChange) =>
          isIdentityEqual(cellChange.colId, change.colId)
            ? { ...cellChange, value: change.value }
            : cellChange
        ),
      };
    }
  }

  return [cellChanges, rowChanges];
}

// apply(apply(S, A), B') = apply(apply(S, B), A')
export function transform(
  currentOperation: OT.Operation,
  receivedOperation: OT.Operation
): [OT.Operation, OT.Operation] {
  const op1Prime = fillOperation(receivedOperation);
  const op2Prime = fillOperation(currentOperation);

  op1Prime.updateCells = op1Prime.updateCells.filter((change) => {
    const { colId, rowId } = change;
    const { deleteCols, deleteRows, updateCells } = op2Prime;
    return !(
      deleteCols.some((col) => isIdentityEqual(col, colId)) ||
      deleteRows.some((row) => isIdentityEqual(row, rowId)) ||
      updateCells.some(
        (c) =>
          isIdentityEqual(c.colId, change.colId) &&
          isIdentityEqual(c.rowId, change.rowId)
      )
    );
  });

  op2Prime.updateCells = op2Prime.updateCells.filter((change) => {
    const { colId, rowId } = change;
    const { deleteCols, deleteRows } = op1Prime;
    return !(
      deleteCols.some((col) => isIdentityEqual(col, colId)) ||
      deleteRows.some((row) => isIdentityEqual(row, rowId))
    );
  });

  return [strip(op2Prime), strip(op1Prime)];
}
