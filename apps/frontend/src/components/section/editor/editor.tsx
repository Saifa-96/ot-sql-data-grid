"use client";

import {
  FocusEventHandler,
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorClient, useSocketIO } from "./hooks/use-socket-io";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Column } from "./schema";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageStackManager } from "./hooks/viewport";
import { match } from "ts-pattern";
import { Operation } from "./ot/operation/types";

export function Editor() {
  const { client, header } = useSocketIO({
    applyServerCallback: () => {
      setRefresh((v) => v + 1);
    },
  });
  const [refresh, setRefresh] = useState(0);

  if (client === null) return <div>loading...</div>;
  return <CanvasDataGrid key={refresh} client={client} header={header} />;
}

const CANVAS_WIDTH = 950;
const CANVAS_HEIGHT = 800;

interface CanvasDataGridProps {
  client: EditorClient;
  header: Column[];
}

function CanvasDataGrid(props: CanvasDataGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { client, header } = props;
  const pageStackMgr = useMemo(
    () => new PageStackManager(client, 30),
    [client]
  );

  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    fieldName: string;
  } | null>(null);

  const virtualizer = useVirtualizer({
    count: 30000,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 4,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const rowsData = useMemo(() => {
    if (virtualRows.length === 0) return;
    const startIndex = virtualRows[0].index;
    const endIndex = virtualRows[virtualRows.length - 1].index;
    const reached = pageStackMgr.calcReachedState(startIndex, endIndex);
    match(reached)
      .with("top", () => pageStackMgr.prevStep())
      .with("bottom", () => pageStackMgr.nextStep())
      .with("out-of-range", () => pageStackMgr.refetchStackData(startIndex));
    return virtualRows.map((i) => ({
      virtualItem: i,
      data: pageStackMgr.getRowDataByIndex(i.index),
    }));
  }, [pageStackMgr, virtualRows, selectedCell]);

  const handleClickCell = useCallback<MouseEventHandler<HTMLTableCellElement>>(
    (e) => {
      const rowId = e.currentTarget.dataset.rowId;
      const fieldName = e.currentTarget.dataset.fieldName;
      if (rowId && fieldName) {
        setSelectedCell({ rowId, fieldName });
      }
    },
    []
  );

  const handleBlur = useCallback<FocusEventHandler<HTMLInputElement>>(
    (e) => {
      if (selectedCell) {
        const { rowId, fieldName } = selectedCell;
        const value = e.currentTarget.value;
        const operation: Operation = {
          updateCells: [
            { rowId: { id: rowId }, colId: { id: fieldName }, value },
          ],
        };
        client.applyClient(operation);
        setTimeout(() => {
          console.log(client);
        }, 500);
        pageStackMgr.refetchStackData();
        setSelectedCell(null);
      }
    },
    [client, pageStackMgr, selectedCell]
  );

  return (
    <ScrollArea
      type="always"
      ref={parentRef}
      className="relative"
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      }}
    >
      <ScrollBar orientation="horizontal" />
      <Table className="grid">
        <TableHeader className="grid bg-white sticky top-0 z-10">
          <TableRow className="flex w-full">
            <TableHead className="flex items-center w-[100px]">No.</TableHead>
            {header.map((h) => (
              <TableHead
                key={h.fieldName}
                className="flex items-center"
                style={{ width: h.width }}
              >
                {h.displayName}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody
          className="grid relative"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {rowsData?.map(({ virtualItem, data }, index) => (
            <TableRow
              className="flex w-full absolute"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
              key={data.get("id")?.toString() ?? virtualItem.index}
            >
              <TableCell className="flex text-ellipsis overflow-hidden text-nowrap w-[100px]">
                {virtualItem.index + 1}
              </TableCell>
              {header.map((h) => {
                const rowId = data.get("id")?.toString();
                const fieldValue = data?.get(h.fieldName)?.toString();
                return (
                  <TableCell
                    key={h.fieldName}
                    className="flex"
                    style={{ width: header[index]?.width ?? 200 }}
                    data-row-id={rowId}
                    data-field-name={h.fieldName}
                    onDoubleClick={handleClickCell}
                  >
                    {selectedCell &&
                    selectedCell.rowId === rowId &&
                    selectedCell.fieldName === h.fieldName ? (
                      <input
                        className="w-full"
                        autoFocus
                        defaultValue={fieldValue}
                        onBlur={handleBlur}
                      />
                    ) : (
                      <p className="text-ellipsis overflow-hidden text-nowrap">
                        {fieldValue}
                      </p>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
