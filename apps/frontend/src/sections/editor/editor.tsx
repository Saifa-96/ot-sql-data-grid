"use client";

import { Card } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Provider } from "jotai";
import { Identity, Operation } from "operational-transformation";
import {
  FC,
  FocusEventHandler,
  memo,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { match, P } from "ts-pattern";
import ColumnFormDialog, {
  ColumnFormData,
} from "./components/column-form-dialog";
import DetailPanel from "./components/detail-panel";
import EditorMenuBar from "./components/editor-menu-bar";
import NewRecordDialog, { FormValues } from "./components/new-record-dialog";
import { useClientCount } from "./hooks/use-client-count";
import { useDialogOpenState } from "./hooks/use-dialog-open-state";
import { useEditorRenderData } from "./hooks/use-editor-render-data";
import { EditorState, useEditorState } from "./hooks/use-editor-state";
import { privateJotaiStore } from "./jotai/client-operations-atom";
import { Progress } from "@/components/ui/progress";

const useFakeProgress = () => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let current_progress = 0;
    let step = 0.5;
    const interval = setInterval(function () {
      current_progress += step;
      const progress =
        Math.round((Math.atan(current_progress) / (Math.PI / 2)) * 100 * 1000) /
        1000;
      setProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      } else {
        step = 0.05;
      }
    }, 100);
    intervalRef.current = interval;

    return () => {
      intervalRef.current = null;
      clearInterval(interval);
    };
  }, []);

  return progress;
};

const Editor: FC = () => {
  const state = useEditorState();
  const progress = useFakeProgress();
  return (
    <div className="flex flex-col items-center space-y-4">
      <Progress className="w-60" value={progress} />
      <div>Loading...</div>
    </div>
  );

  return match(state)
    .returnType<ReactNode>()
    .with(P.nullish, () => (
      <div className="flex justify-center space-y-4">
        <Progress className="w-60" />
        <div>Loading...</div>
      </div>
    ))
    .with(P.nonNullable, (state) => (
      <div>
        <ul className="list-inside list-decimal mb-3 text-gray-500 text-sm">
          <li>
            This table is a collaborative table. You can open two windows to
            test it.
          </li>
          <li>
            You can use the `New Record` button to insert a new record and
            right-click rows to delete them.
          </li>
          <li>
            You can use the `New Column` button to add a new column, or
            right-click on header cells to insert or delete columns.
          </li>
        </ul>
        <CanvasDataGrid editorState={state} />
      </div>
    ))
    .exhaustive();
};

export default memo(Editor);

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;

interface CanvasDataGridProps {
  editorState: EditorState;
}

const CanvasDataGrid: FC<CanvasDataGridProps> = (props) => {
  const { editorState } = props;
  const {
    totalCount,
    virtualizer,
    header,
    rowsData,
    containerRef,
    resetCurrentPageStack,
    resetCurrentHeader,
  } = useEditorRenderData(editorState);

  const existingNames = useMemo(() => header.map((h) => h.fieldName), [header]);
  const columnDialogState = useDialogOpenState();
  const recordDialogState = useDialogOpenState();
  const clientCount = useClientCount(editorState);

  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    fieldName: string;
  } | null>(null);

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
        editorState.client.applyClient(operation);
        setSelectedCell(null);
        resetCurrentPageStack();
      }
    },
    [editorState.client, resetCurrentPageStack, selectedCell]
  );

  const handleDelete = useCallback(
    (rowId: string) => {
      const operation: Operation = {
        deleteRows: [{ uuid: rowId }],
      };
      editorState.client.applyClient(operation);
      resetCurrentPageStack();
    },
    [editorState.client, resetCurrentPageStack]
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
      recordDialogState.methods.close();
      editorState.client.applyClient(operation);
      resetCurrentPageStack();
    },
    [editorState.client, recordDialogState.methods, resetCurrentPageStack]
  );

  const handleDeleteColumn = useCallback(
    (columnName: string) => {
      const operation: Operation = {
        deleteCols: [{ uuid: columnName }],
      };
      editorState.client.applyClient(operation);
      resetCurrentPageStack();
      resetCurrentHeader();
    },
    [editorState.client, resetCurrentHeader, resetCurrentPageStack]
  );

  const orderByRef = useRef<number | null>(null);
  const handleOpenColumnDialog = useCallback(
    (orderBy: number = 10000) => {
      orderByRef.current = orderBy;
      columnDialogState.methods.open();
    },
    [columnDialogState.methods]
  );

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
      editorState.client.applyClient(operation);
      columnDialogState.methods.close();
      resetCurrentPageStack();
      resetCurrentHeader();
    },
    [
      columnDialogState.methods,
      editorState.client,
      resetCurrentHeader,
      resetCurrentPageStack,
    ]
  );

  return (
    <Provider store={privateJotaiStore}>
      <div className="flex space-x-4">
        <Card className="overflow-hidden">
          <EditorMenuBar
            clientCount={clientCount}
            onNewColumn={handleOpenColumnDialog}
            onNewRecord={recordDialogState.methods.open}
          />
          <ScrollArea
            type="always"
            ref={containerRef}
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
                  <TableHead className="flex items-center w-[60px]">
                    No.
                  </TableHead>
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
                        <TableCell className="flex text-ellipsis overflow-hidden text-nowrap w-[60px]">
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

          <div className="py-1 px-2">
            <p className="text-sm font-bold">
              <span className="text-gray-500">Total Count: </span>
              {totalCount}
            </p>
          </div>
          <NewRecordDialog
            open={recordDialogState.open}
            setOpen={recordDialogState.methods.setOpen}
            onSubmit={handleAddItem}
          />
          <ColumnFormDialog
            existingNames={existingNames}
            open={columnDialogState.open}
            setOpen={columnDialogState.methods.setOpen}
            onSubmit={handleSubmitInsertColumn}
          />
        </Card>
        <DetailPanel socketMgr={editorState.socketMgr} />
      </div>
    </Provider>
  );
};
