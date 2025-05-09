"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SQLStore } from "sql-store";
import PageStack, {
  initialPageStack,
  refreshPageStack,
  updatePageStack,
} from "./page-stack";

const sortedColumns = (sqlStore: SQLStore) => () =>
  sqlStore.getColumns().sort((a, b) => a.orderBy - b.orderBy);

export const useDataGrid = (sqlStore: SQLStore) => {
  const [header, setHeader] = useState(sortedColumns(sqlStore));
  const [pageStack, setPageStack] = useState<PageStack>(() =>
    initialPageStack(sqlStore)
  );
  const [totalCount, setTotalCount] = useState(() =>
    sqlStore.getRecordTotalCount()
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    overscan: 4,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const rowsData = useMemo(() => {
    if (virtualRows.length === 0) return [];
    const startIndex = virtualRows[0].index;
    const endIndex = virtualRows[virtualRows.length - 1].index;
    return pageStack.getRowsData(startIndex, endIndex).map((data, index) => ({
      virtualItem: virtualRows[index],
      data,
    }));
  }, [pageStack, virtualRows]);

  const resetCurrentPageStack = useCallback(() => {
    setTotalCount(sqlStore.getRecordTotalCount());
    setPageStack(refreshPageStack(sqlStore));
  }, [sqlStore]);

  const resetCurrentHeader = useCallback(() => {
    setHeader(sortedColumns(sqlStore));
  }, [sqlStore]);

  useEffect(() => {
    if (virtualRows.length === 0) return;
    const start = virtualRows[0].index;
    const end = virtualRows[virtualRows.length - 1].index;
    const id = setTimeout(() => {
      const pageStack = updatePageStack({
        start,
        end,
        store: sqlStore,
      });
      return setPageStack(pageStack);
    }, 100);
    return () => clearTimeout(id);
  }, [sqlStore, virtualRows]);

  return {
    virtualizer,
    header,
    rowsData,
    containerRef,
    resetCurrentPageStack,
    resetCurrentHeader,
  };
};
