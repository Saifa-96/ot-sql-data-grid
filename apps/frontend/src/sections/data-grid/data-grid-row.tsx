import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { PropsWithChildren } from "react";

interface DataGridRowProps {
  rowId: string;
  no: number;
  onDeleteRow: (rowId: string) => void;
  style: React.CSSProperties;
}

const DataGridRow: React.FC<PropsWithChildren<DataGridRowProps>> = ({
  rowId,
  style,
  no,
  onDeleteRow,
  children,
}) => {
  return (
    <ContextMenu>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onDeleteRow(rowId)}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
      <ContextMenuTrigger asChild>
        <TableRow className="flex w-full absolute" style={style}>
          <TableCell className="flex text-ellipsis overflow-hidden text-nowrap w-[60px]">
            {no}
          </TableCell>
          <TableCell className="flex text-ellipsis overflow-hidden text-nowrap w-[300px]">
            {rowId}
          </TableCell>
          {children}
        </TableRow>
      </ContextMenuTrigger>
    </ContextMenu>
  );
};

export default DataGridRow;
