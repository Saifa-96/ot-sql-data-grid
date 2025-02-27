"use client";

import {
  FocusEventHandler,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageStack } from "./page-stack";
import { Identity, Operation } from "operational-transformation";
import { match, P } from "ts-pattern";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useEditorClient } from "./jotai/atoms";
import { EditorClient } from "./jotai/editor-client";
import { FormDialog, FormValues } from "./form-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react"
import { ColumnFormData, ColumnFormDialog } from "./column-form-dialog";

export function Editor() {
  const { client } = useEditorClient();
  const content = match(client)
    .returnType<ReactNode>()
    .with({ state: "loading" }, () => <div>loading...</div>)
    .with({ state: "hasError" }, () => <div>Somethings got error</div>)
    .with({ state: "hasData", data: null }, () => <div>loading...</div>)
    .with({ state: "hasData", data: P.nonNullable.select() }, (c) => (
      <CanvasDataGrid client={c} />
    ))
    .exhaustive();

  const [loading, setLoading] = useState(false);
  const handleReset = useCallback(() => {
    if (client.state === "hasData") {
      setLoading(true);
      client.data?.reset();
    }
  }, [client]);

  return (
    <>
      <div>
        <Button disabled={loading} onClick={handleReset}>
          {loading && <Loader2 className="animate-spin" />}
          Reset
        </Button>
      </div>
      {content}
    </>
  );
}

const CANVAS_WIDTH = 950;
const CANVAS_HEIGHT = 800;

interface CanvasDataGridProps {
  client: EditorClient;
}

const initialPageStack = (
  client: EditorClient,
  startPage: number = 1
): PageStack => {
  const rows = client.getRowsByPage(startPage, 90);
  return new PageStack(
    [
      { data: rows.slice(0, 30), page: startPage },
      { data: rows.slice(30, 60), page: startPage + 1 },
      { data: rows.slice(60, 90), page: startPage + 2 },
    ],
    30
  );
};

function sortHeader(
  header: {
    id: string;
    fieldName: string;
    width: number;
    displayName: string;
    orderBy: number;
  }[]
) {
  return header.sort((a, b) => a.orderBy - b.orderBy);
}

function CanvasDataGrid(props: CanvasDataGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { client } = props;
  const [header, setHeader] = useState(() => sortHeader(client.getHeader()));
  const existingNames = useMemo(() => header.map((h) => h.fieldName), [header]);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const handleOpenRecordDialog = useCallback(() => {
    setRecordDialogOpen(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      console.log("listen");
      client.listenEvents(() => {
        console.log("apply server");
        setHeader(sortHeader(client.getHeader()));
        resetCurrentPageStack();
      });
    };
    init();

    return () => {
      client.stopListeningEvents();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pageStack, setPageStack] = useState<PageStack>(() =>
    initialPageStack(client)
  );

  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    fieldName: string;
  } | null>(null);

  const [totalCount, setTotalCount] = useState(client.getTotalCount());

  const virtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => parentRef.current,
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

  const resetCurrentPageStack = useCallback(
    (currentIdx?: number) => {
      setTotalCount(client.getTotalCount());
      setPageStack((ps) => {
        const [page0, page1, page2] = currentIdx
          ? ps.getPageRangeByCurrentIndex(currentIdx)
          : ps.getCurrentPages();
        return new PageStack(
          [
            {
              data: client.getRowsByPage(page0, 30),
              page: page0,
            },
            {
              data: client.getRowsByPage(page1, 30),
              page: page1,
            },
            {
              data: client.getRowsByPage(page2, 30),
              page: page2,
            },
          ],
          30
        );
      });
    },
    [client]
  );

  useEffect(() => {
    if (virtualRows.length === 0) return;
    const startIndex = virtualRows[0].index;
    const endIndex = virtualRows[virtualRows.length - 1].index;
    const resetPageStack = (ps: PageStack) => {
      const reached = ps.getReachedState(startIndex, endIndex);
      if (reached === null) return ps;

      return match(reached)
        .returnType<PageStack>()
        .with("top", () =>
          ps.prevStep((page) => client.getRowsByPage(page, 30))
        )
        .with("bottom", () =>
          ps.nextStep((page) => client.getRowsByPage(page, 30))
        )
        .with("out-of-range", () => {
          const [page0, page1, page2] =
            ps.getPageRangeByCurrentIndex(startIndex);
          return new PageStack(
            [
              {
                data: client.getRowsByPage(page0, 30),
                page: page0,
              },
              {
                data: client.getRowsByPage(page1, 30),
                page: page1,
              },
              {
                data: client.getRowsByPage(page2, 30),
                page: page2,
              },
            ],
            30
          );
        })
        .exhaustive();
    };
    const id = setTimeout(() => setPageStack(resetPageStack), 300);
    return () => clearTimeout(id);
  }, [client, virtualRows]);

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
            { rowId: { uuid: rowId }, colId: { uuid: fieldName }, value },
          ],
        };
        client.applyClient(operation);
        setSelectedCell(null);
        resetCurrentPageStack();
      }
    },
    [client, resetCurrentPageStack, selectedCell]
  );

  const handleDelete = useCallback(
    (rowId: string) => {
      const operation: Operation = {
        deleteRows: [{ uuid: rowId }],
      };
      client.applyClient(operation);
      resetCurrentPageStack();
    },
    [client, resetCurrentPageStack]
  );

  const handleAddItem = useCallback(
    (formData: FormValues) => {
      const data = {
        wid: null,
        name: formData.name,
        gender: formData.gender,
        email: formData.email,
        phone: formData.phone,
        birthday: null,
      };
      const operation: Operation = {
        insertRows: [
          {
            id: { symbol: "" + new Date() },
            data: Object.entries(data).map(([key, value]) => ({
              colId: { uuid: key },
              value,
            })),
          },
        ],
      };
      setRecordDialogOpen(false);
      client.applyClient(operation);
      resetCurrentPageStack();
    },
    [client, resetCurrentPageStack]
  );

  const handleDeleteColumn = useCallback(
    (columnName: string) => {
      const operation: Operation = {
        deleteCols: [{ uuid: columnName }],
      };
      client.applyClient(operation);
      resetCurrentPageStack();
      setHeader(sortHeader(client.getHeader()));
    },
    [client, resetCurrentPageStack]
  );

  const orderByRef = useRef<number | null>(null);
  const handleOpenColumnDialog = useCallback((orderBy: number) => {
    orderByRef.current = orderBy;
    setColumnDialogOpen(true);
  }, []);

  const handleSubmitInsertColumn = useCallback(
    (data: ColumnFormData) => {
      if (orderByRef.current === null) return;
      const id: Identity = { symbol: "" + new Date() };
      const operation: Operation = {
        insertCols: [
          {
            id,
            orderBy: orderByRef.current + 1,
            name: data.name,
            displayName: data.displayName,
            width: 200,
            type: "TEXT",
          },
        ],
      };
      client.applyClient(operation);
      setColumnDialogOpen(false);
      resetCurrentPageStack();
      setHeader(sortHeader(client.getHeader()));
    },
    [client, resetCurrentPageStack]
  );

  return (
    <>
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
              <TableHead className="flex items-center w-[99px]">No.</TableHead>
              {header.map((h) => (
                <ContextMenu key={h.fieldName}>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => handleDeleteColumn(h.fieldName)}
                    >
                      Delete Column
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleOpenColumnDialog(h.orderBy)}
                    >
                      Insert Column
                    </ContextMenuItem>
                  </ContextMenuContent>
                  <ContextMenuTrigger asChild>
                    <TableHead
                      className="flex items-center"
                      style={{ width: h.width }}
                    >
                      {h.displayName}
                    </TableHead>
                  </ContextMenuTrigger>
                </ContextMenu>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody
            className="grid relative"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {rowsData?.map(({ virtualItem, data }) => (
              <ContextMenu
                key={data?.get("id")?.toString() ?? virtualItem.index}
              >
                <ContextMenuContent>
                  <ContextMenuItem
                    onSelect={() =>
                      handleDelete(data?.get("id")?.toString() ?? "")
                    }
                  >
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
                <ContextMenuTrigger asChild>
                  <TableRow
                    className="flex w-full absolute"
                    style={{
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <TableCell className="flex text-ellipsis overflow-hidden text-nowrap w-[99px]">
                      {virtualItem.index + 1}
                    </TableCell>
                    {header.map((h, index) => {
                      const style = { width: header[index]?.width ?? 199 };
                      if (data === null) {
                        return (
                          <TableCell
                            key={h.fieldName}
                            className="flex"
                            style={style}
                          >
                            null
                          </TableCell>
                        );
                      }
                      const rowId = data.get("id")?.toString();
                      const fieldValue = data?.get(h.fieldName)?.toString();
                      return (
                        <TableCell
                          key={h.fieldName}
                          className="flex"
                          style={style}
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
                </ContextMenuTrigger>
              </ContextMenu>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <Button className="mt-3" onClick={handleOpenRecordDialog}>
        New Record
      </Button>
      <FormDialog
        open={recordDialogOpen}
        setOpen={setRecordDialogOpen}
        onSubmit={handleAddItem}
      />
      <ColumnFormDialog
        existingNames={existingNames}
        open={columnDialogOpen}
        setOpen={setColumnDialogOpen}
        onSubmit={handleSubmitInsertColumn}
      />
    </>
  );
}
