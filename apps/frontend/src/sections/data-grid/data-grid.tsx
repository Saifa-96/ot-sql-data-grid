"use client";

import { TableBody } from "@/components/ui/table";
import * as op from "@/utils/operation-helper";
import { isEqual } from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import { openColumnFormDialog } from "../modal/column-form-dialog";
import { useEditorContext } from "../use-editor-context";
import DataGridCell, { CellData } from "./data-grid-cell";
import DataGridHeader from "./data-grid-header";
import DataGridRow from "./data-grid-row";
import DataGridView from "./data-grid-view";
import { useDataGrid } from "./use-data-grid";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;

const DataGrid = () => {
  const { store, client } = useEditorContext();
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const valueRef = useRef<string | null>(null);

  const {
    resetCurrentHeader,
    resetCurrentPageStack,
    header,
    rowsData,
    containerRef,
    virtualizer,
  } = useDataGrid(store);

  useEffect(() => {
    const update = () => {
      resetCurrentHeader();
      resetCurrentPageStack();
    };

    client.subscribeToEvent("apply-server", update);
    client.subscribeToEvent("server-ack", update);
    client.subscribeToEvent("apply-client", update);
    return () => {
      client.unsubscribeFromEvent("apply-server", update);
      client.unsubscribeFromEvent("server-ack", update);
      client.unsubscribeFromEvent("apply-client", update);
    };
  }, [resetCurrentPageStack, resetCurrentHeader, client]);

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
      <DataGridHeader
        columns={header}
        onDeleteColumn={methods.deleteColumn}
        onInsertColumn={methods.insertColumn}
      />

      <TableBody
        className="grid relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {rowsData.map(({ virtualItem, data }) => {
          const row = data.id!.toString();
          return (
            <DataGridRow
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
                return (
                  <DataGridCell
                    row={row}
                    col={col}
                    selected={isSelected}
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

export default DataGrid;
