import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { ColumnChanges } from "operational-transformation";
import { PropsWithChildren } from "react";

export const DataGridHeader: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <TableHeader className="grid bg-white sticky top-0 z-10">
      <TableRow className="flex w-full">
        <TableHead className="flex items-center w-[60px]">No.</TableHead>
        <TableHead className="flex items-center w-[300px]">ID</TableHead>
        {children}
      </TableRow>
    </TableHeader>
  );
};

interface DataGridHeadProps extends VariantProps<typeof headVariants> {
  column: ColumnChanges;
  onDeleteColumn: (fieldName: string) => void;
  onInsertColumn: (orderBy: number) => void;
}

export const DataGridHead: React.FC<DataGridHeadProps> = ({
  column,
  type,
  onDeleteColumn,
  onInsertColumn,
}) => {
  return (
    <ContextMenu key={column.fieldName}>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onDeleteColumn(column.fieldName)}>
          Delete Column
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onInsertColumn(column.orderBy)}>
          Insert Column
        </ContextMenuItem>
      </ContextMenuContent>
      <ContextMenuTrigger asChild>
        <TableHead
          className={cn("flex items-center", headVariants({ type }))}
          style={{ width: column.width }}
        >
          {column.displayName}
        </TableHead>
      </ContextMenuTrigger>
    </ContextMenu>
  );
};

const headVariants = cva("flex items-center", {
  variants: {
    type: {
      standard: "",
      deleted: "bg-red-100 text-red-800",
      inserted: "bg-green-100 text-green-800",
    },
  },
});
