"use client";

import {
  ColumnChanges,
  identityToString,
  Operation,
  RecordChanges,
} from "operational-transformation";
import { useCallback, useMemo, useState } from "react";
import { SQLStore } from "sql-store";
import PageStack, {
  initialPageStack,
  refreshPageStack,
  updatePageStack,
} from "./page-stack";
import { SqlValue } from "sql.js";

export interface DiffState {
  columns: Map<string, "inserted" | "deleted">;
  records: Map<string, "inserted" | "deleted">;
  properties: Map<string, Set<string>>;
}

export const useDataGrid = (store: SQLStore, operation: Operation | null) => {
  const diffState = useMemo<DiffState | null>(() => {
    if (operation === null) return null;
    return toDiffState(operation);
  }, [operation]);

  const [columns, setColumns] = useState(() => store.getColumns());
  const header = useMemo(() => {
    return formatHeader(columns, operation);
  }, [columns, operation]);
  const [pageStack, setPageStack] = useState<PageStack>(() =>
    initialPageStack(store)
  );
  const [totalCount, setTotalCount] = useState(() =>
    store.getRecordTotalCount()
  );

  const resetPageStack = useCallback(() => {
    setTotalCount(resetTotalCount(store, operation));
    setPageStack(refreshPageStack(store));
  }, [operation, store]);

  const shiftPageStack = useCallback(
    (start: number, end: number) => {
      setPageStack(updatePageStack({ start, end, store }));
    },
    [store]
  );

  const getRowsData = useCallback(
    (start: number, end: number) => {
      const data = pageStack.getRowsData(start, end);

      if (!operation) {
        return data;
      }

      const length = operation.insertRecords?.flatMap((i) => i.ids).length ?? 0;
      const index = length - 1;
      if (operation.insertRecords && start < index) {
        const insertRows = recordChangesToRowsData(operation.insertRecords);
        data.unshift(...insertRows.slice(start));
      }

      if (operation.updateRecords) {
        const map = recordChangesToRowsMap(operation.updateRecords);
        data.forEach((row) => {
          const id = row.id!.toString();
          if (map.has(id)) {
            Object.assign(row, map.get(id));
          }
        });
      }
      return data;
    },
    [pageStack, operation]
  );

  const resetDataGrid = useCallback(() => {
    setColumns(store.getColumns());
    resetPageStack();
  }, [resetPageStack, store]);

  // const showDiff = useCallback((op: Operation | null) => {
  //   setOperation(op);
  // }, []);

  return {
    diffState,
    // showDiff,
    totalCount,
    header,
    getRowsData,
    shiftPageStack,
    resetDataGrid,
    resetPageStack,
  };
};

const formatHeader = (
  columns: ColumnChanges[],
  operation?: Operation | null
) => {
  if (operation?.insertColumns) {
    const insertColumns = Object.values(operation.insertColumns);
    return [...columns, ...insertColumns].sort((a, b) => a.orderBy - b.orderBy);
  }
  return columns.sort((a, b) => a.orderBy - b.orderBy);
};

const resetTotalCount = (store: SQLStore, operation: Operation | null) => {
  const count = store.getRecordTotalCount();
  if (operation?.insertRecords) {
    const insertCount = operation.insertRecords.length || 0;
    return count + insertCount;
  }
  return count;
};

const recordChangesToRowsData = (
  changes: RecordChanges[]
): Record<string, SqlValue>[] => {
  return changes.flatMap(({ ids, columns, values }) => {
    return ids.map((identity, rowIdx) => {
      const id = identityToString(identity);
      return Object.fromEntries([
        ["id", id],
        ...columns.map((column, index) => [column, values[rowIdx][index]]),
      ]);
    });
  });
};

const recordChangesToRowsMap = (
  changes: RecordChanges[]
): Map<string, Record<string, SqlValue>> => {
  const map = new Map<string, Record<string, SqlValue>>();
  changes.forEach(({ ids, columns, values }) => {
    ids.forEach((identity, rowIdx) => {
      const id = identityToString(identity);
      const rowData: Record<string, SqlValue> = { id };
      columns.forEach((column, index) => {
        rowData[column] = values[rowIdx][index];
      });
      map.set(id, rowData);
    });
  });
  return map;
};

const toDiffState = (operation: Operation) => {
  const columns: Map<string, "inserted" | "deleted"> = new Map();
  if (operation.insertColumns) {
    Object.keys(operation.insertColumns).forEach((key) => {
      columns.set(key, "inserted");
    });
  }
  if (operation.deleteColumns) {
    operation.deleteColumns.forEach((key) => {
      columns.set(key, "deleted");
    });
  }

  const records: Map<string, "inserted" | "deleted"> = new Map();
  if (operation.insertRecords) {
    operation.insertRecords.forEach(({ ids }) => {
      ids.forEach((id) => {
        records.set(identityToString(id), "inserted");
      });
    });
  }
  if (operation.deleteRecords) {
    operation.deleteRecords.forEach((id) => {
      records.set(identityToString(id), "deleted");
    });
  }

  const properties: Map<string, Set<string>> = new Map();
  if (operation.updateRecords) {
    operation.updateRecords.forEach(({ ids, columns }) => {
      ids.forEach((id) => {
        const idStr = identityToString(id);
        columns.forEach((column) => {
          if (!properties.has(idStr)) {
            properties.set(idStr, new Set());
          }
          const set = properties.get(idStr)!;
          set.add(column);
        });
      });
    });
  }

  return { columns, records, properties };
};
