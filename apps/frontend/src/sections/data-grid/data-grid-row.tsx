import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { cva, VariantProps } from "class-variance-authority";
import { PropsWithChildren } from "react";

interface DataGridRowProps extends VariantProps<typeof rowVariants> {
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
  type,
}) => {
  return (
    <ContextMenu>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onDeleteRow(rowId)}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
      <ContextMenuTrigger asChild>
        <TableRow className={rowVariants({ type })} style={style}>
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

const rowVariants = cva("flex w-full absolute", {
  variants: {
    type: {
      standard: "",
      deleted: "bg-red-100 text-red-800",
      inserted: "bg-green-100 text-green-800",
    },
  },
  defaultVariants: {
    type: "standard",
  },
});

export default DataGridRow;
