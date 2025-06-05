"use client";

import { TableBody } from "@/components/ui/table";
import * as op from "@/utils/operation-helper";
import { isEqual } from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import { openColumnFormDialog } from "../modal/column-form-dialog";
import { useEditorContext } from "../use-editor-context";
import DataGridCell, { CellData } from "./data-grid-cell";
import { DataGridHeader, DataGridHead } from "./data-grid-header";
import DataGridRow from "./data-grid-row";
import DataGridView from "./data-grid-view";
import { DiffState, useDataGrid } from "./use-data-grid";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEditorState } from "../use-editor-state";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;

const DataGrid = () => {
  const [{ mode }] = useEditorState();
  const { store, client } = useEditorContext();
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const valueRef = useRef<string | null>(null);

  const isDiffMode = mode.type === "diff";
  const diffOperation = isDiffMode ? mode.operation : null;
  const {
    header,
    diffState,
    totalCount,
    getRowsData,
    resetDataGrid,
    resetPageStack,
    shiftPageStack,
  } = useDataGrid(store, diffOperation);

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
    return getRowsData(startIndex, endIndex)
      .map((data, index) => ({
        virtualItem: virtualRows[index],
        data,
      }))
      .filter((item) => !!item.virtualItem);
  }, [getRowsData, virtualRows]);

  useEffect(() => {
    if (virtualRows.length === 0) return;
    const start = virtualRows[0].index;
    const end = virtualRows[virtualRows.length - 1].index;
    const id = setTimeout(() => shiftPageStack(start, end), 100);
    return () => clearTimeout(id);
  }, [shiftPageStack, store, virtualRows]);

  useEffect(() => {
    client.emitter.on("applyServer", resetDataGrid);
    client.emitter.on("serverAck", resetDataGrid);
    client.emitter.on("applyClient", resetDataGrid);
    return () => {
      client.emitter.off("applyServer", resetDataGrid);
      client.emitter.off("serverAck", resetDataGrid);
      client.emitter.off("applyClient", resetDataGrid);
    };
  }, [resetPageStack, client, resetDataGrid]);

  const methods = useMemo(
    () => ({
      deleteColumn: (columnName: string) => {
        client.applyClient(op.deleteColumn(columnName));
      },
      insertColumn: (orderBy: number) => {
        openColumnFormDialog({
          orderBy: orderBy - 1,
          onSubmit(data) {
            client.applyClient(op.insertColumn(data));
          },
        });
      },
      inputBlur: ({ row, col, value }: CellData) => {
        if (valueRef.current !== value) {
          client.applyClient(op.updateRecordProperty(row, col, value));
        }
        setSelectedCell(null);
        valueRef.current = null;
      },
      deleteRecord: (rowId: string) => {
        client.applyClient(op.deleteRecord(rowId));
      },
    }),
    [client]
  );

  return (
    <DataGridView
      ref={containerRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
    >
      <DataGridHeader>
        {header.map((column) => (
          <DataGridHead
            key={column.fieldName}
            column={column}
            type={diffState?.columns.get(column.fieldName)}
            onDeleteColumn={methods.deleteColumn}
            onInsertColumn={methods.insertColumn}
          />
        ))}
      </DataGridHeader>

      <TableBody
        className="grid relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {rowsData.map(({ virtualItem, data }) => {
          const row = data.id!.toString();
          return (
            <DataGridRow
              type={diffState?.records.get(row)}
              key={row}
              no={virtualItem.index + 1}
              rowId={row}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
              onDeleteRow={methods.deleteRecord}
            >
              {header.map(({ fieldName: col, width }) => {
                const value = data[col]?.toString() ?? "";
                const isSelected = isEqual(selectedCell, { row, col, value });
                const cellType = getCellType(diffState, col, row);
                return (
                  <DataGridCell
                    disabled={isDiffMode}
                    type={cellType}
                    selected={isSelected}
                    row={row}
                    col={col}
                    key={col}
                    value={value}
                    style={{ width }}
                    onSelectCell={(cellData) => {
                      setSelectedCell(cellData);
                      valueRef.current = cellData.value;
                    }}
                    onInputBlur={methods.inputBlur}
                  />
                );
              })}
            </DataGridRow>
          );
        })}
      </TableBody>
    </DataGridView>
  );
};

const getCellType = (diffState: DiffState | null, col: string, row: string) => {
  if (!diffState) return undefined;
  const colState = diffState.columns.get(col);
  if (colState === "deleted") {
    return colState;
  }
  const rowState = diffState.records.get(row);
  if (rowState === "deleted") {
    return rowState;
  }

  const isUpdated = diffState.properties.get(row)?.has(col)
    ? "updated"
    : undefined;

  const cellState = colState ?? rowState ?? isUpdated;
  return cellState;
};

export default DataGrid;
