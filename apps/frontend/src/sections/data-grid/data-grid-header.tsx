import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { ColumnChanges } from "operational-transformation";

interface DataGridHeaderProps {
  columns: ColumnChanges[];
  onDeleteColumn: (fieldName: string) => void;
  onInsertColumn: (orderBy: number) => void;
}

const DataGridHeader: React.FC<DataGridHeaderProps> = ({
  columns,
  onDeleteColumn,
  onInsertColumn,
}) => {
  return (
    <TableHeader className="grid bg-white sticky top-0 z-10">
      <TableRow className="flex w-full">
        <TableHead className="flex items-center w-[60px]">No.</TableHead>
        <TableHead className="flex items-center w-[300px]">ID</TableHead>
        {columns.map((col) => (
          <ContextMenu key={col.fieldName}>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onDeleteColumn(col.fieldName)}>
                Delete Column
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onInsertColumn(col.orderBy)}>
                Insert Column
              </ContextMenuItem>
            </ContextMenuContent>
            <ContextMenuTrigger asChild>
              <TableHead
                className="flex items-center"
                style={{ width: col.width }}
              >
                {col.displayName}
              </TableHead>
            </ContextMenuTrigger>
          </ContextMenu>
        ))}
      </TableRow>
    </TableHeader>
  );
};

export default DataGridHeader;
