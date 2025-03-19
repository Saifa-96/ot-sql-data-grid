import { concat, differenceWith, isEmpty, union, unionWith } from 'lodash';
import {
  type Identity,
  type ClientSymbol,
  type UUID,
  getBothUUIDandClientSymbol,
  isClientSymbol,
  isIdentityEqual,
} from './identity';

export interface Operation<ID extends Identity = Identity> {
  updateCells?: UpdateCell<ID>[];
  deleteRows?: ID[];
  insertRows?: InsertRow<ID>[];
  deleteCols?: ID[];
  insertCols?: InsertCol<ID>[];
}

export interface UpdateCell<ID extends Identity = Identity> {
  colId: ID;
  rowId: ID;
  value: string;
}

export interface InsertRow<ID extends Identity = Identity> {
  id: ID;
  data: {
    colId: ID;
    value: unknown;
  }[];
}

export interface InsertCol<ID extends Identity = Identity> {
  id: ID;
  name: string;
  width: number;
  displayName: string;
  orderBy: number;
  type: string;
}


// Compose merges two consecutive operations into one operation, that
// preserves the changes of both. Or, in other words, for each change S
// and a pair of consecutive operations A and B,
// apply(apply(S, A), B) = apply(S, compose(A, B)) must hold.
export function compose(op1: Operation, op2: Operation): Operation {
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
  updateCells: UpdateCell[],
  insertRows: InsertRow[]
): [UpdateCell[], InsertRow[]] {
  let rowChanges: InsertRow[] = [...insertRows];
  let cellChanges: UpdateCell[] = [];
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

// Transform takes two operations A and B that happened concurrently and
// produces two operations A' and B' (in an array) such that
// `apply(apply(S, A), B') = apply(apply(S, B), A')`. This function is the
// heart of OT.
export function transform(
  currentOperation: Operation,
  receivedOperation: Operation
): [Operation, Operation] {
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

type Required<T> = {
  [P in keyof T]-?: T[P];
};

export function fillOperation(op: Operation = {}): Required<Operation> {
  return {
    deleteRows: op.deleteRows ?? [],
    deleteCols: op.deleteCols ?? [],
    insertRows: op.insertRows ?? [],
    insertCols: op.insertCols ?? [],
    updateCells: op.updateCells ?? [],
  };
}

export function strip(o: Required<Operation>) {
  const newOp = { ...o };
  Object.entries(o).forEach(([key, value]) => {
    if (isEmpty(value)) {
      delete newOp[key as keyof Operation];
    }
  });
  return newOp;
}

export const mapClientSymbolToUUID = (
  operation: Operation,
  callback: (symbol: ClientSymbol) => UUID
): Operation<UUID> => {
  const newOp: Operation<UUID> = {};
  newOp.deleteRows = operation.deleteRows?.map((id) =>
    isClientSymbol(id) ? callback(id) : id
  );
  newOp.deleteCols = operation.deleteCols?.map((id) =>
    isClientSymbol(id) ? callback(id) : id
  );
  newOp.insertRows = operation.insertRows?.map((row) => ({
    id: isClientSymbol(row.id) ? callback(row.id) : row.id,
    data: row.data.map(({ colId, value }) => ({
      colId: isClientSymbol(colId) ? callback(colId) : colId,
      value,
    })),
  }));
  newOp.insertCols = operation.insertCols?.map((col) => ({
    ...col,
    id: isClientSymbol(col.id) ? callback(col.id) : col.id,
  }));
  newOp.updateCells = operation.updateCells?.map((cell) => ({
    ...cell,
    colId: isClientSymbol(cell.colId) ? callback(cell.colId) : cell.colId,
    rowId: isClientSymbol(cell.rowId) ? callback(cell.rowId) : cell.rowId,
  }));
  return newOp;
}

export const getClientSymbolMap = (operation: Operation): Map<string, string> => {
  const map = new Map<string, string>();
  operation.insertCols?.forEach((col) => {
    const result = getBothUUIDandClientSymbol(col.id);
    if (result) {
      map.set(result.symbol, result.uuid)
    }
  });
  operation.insertRows?.forEach((row) => {
    const result = getBothUUIDandClientSymbol(row.id);
    if (result) {
      map.set(result.symbol, result.uuid)
    }
  });
  operation.updateCells?.forEach((cell) => {
    const result = getBothUUIDandClientSymbol(cell.colId);
    if (result) {
      map.set(result.symbol, result.uuid)
    }
    const result2 = getBothUUIDandClientSymbol(cell.rowId);
    if (result2) {
      map.set(result2.symbol, result2.uuid)
    }
  });
  return map;
}