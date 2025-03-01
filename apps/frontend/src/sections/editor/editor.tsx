"use client";

import {
  FocusEventHandler,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Identity, Operation } from "operational-transformation";
import { match, P } from "ts-pattern";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { NewRecordDialog, FormValues } from "./new-record-dialog";
import { Button } from "@/components/ui/button";
import { ColumnFormData, ColumnFormDialog } from "./column-form-dialog";
import { EditorState, useEditorState } from "./hooks/use-editor-state";
import { useEditorRenderData } from "./hooks/use-editor-render-data";

export function Editor() {
  const state = useEditorState();

  return match(state)
    .returnType<ReactNode>()
    .with(P.nullish, () => <div>Loading...</div>)
    .with(P.nonNullable, (state) => <CanvasDataGrid editorState={state} />)
    .exhaustive();
}

const CANVAS_WIDTH = 950;
const CANVAS_HEIGHT = 800;

interface CanvasDataGridProps {
  editorState: EditorState;
}

function CanvasDataGrid(props: CanvasDataGridProps) {
  const { editorState } = props;
  const {
    virtualizer,
    header,
    rowsData,
    containerRef,
    resetCurrentPageStack,
    resetCurrentHeader,
  } = useEditorRenderData(editorState);

  const existingNames = useMemo(() => header.map((h) => h.fieldName), [header]);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const handleOpenRecordDialog = useCallback(() => {
    setRecordDialogOpen(true);
  }, []);

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
      setRecordDialogOpen(false);
      editorState.client.applyClient(operation);
      resetCurrentPageStack();
    },
    [editorState.client, resetCurrentPageStack]
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
      editorState.client.applyClient(operation);
      setColumnDialogOpen(false);
      resetCurrentPageStack();
      resetCurrentHeader();
    },
    [editorState.client, resetCurrentHeader, resetCurrentPageStack]
  );

  return (
    <>
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
      <NewRecordDialog
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
