import { TableCell } from "@/components/ui/table";

export interface CellData {
  row: string;
  col: string;
  value: string;
}

interface DataGridCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  row: string;
  col: string;
  selected?: boolean;
  value: string;
  onSelectCell: (params: CellData) => void;
  onInputBlur: (params: CellData) => void;
}

const DataGridCell: React.FC<DataGridCellProps> = ({
  row,
  col,
  selected,
  value,
  onInputBlur,
  onSelectCell,
  ...rest
}) => {
  return (
    <TableCell
      className="flex"
      {...rest}
      onDoubleClick={() => {
        onSelectCell({ row, col, value });
      }}
    >
      {selected ? (
        <input
          className="w-full"
          autoFocus
          defaultValue={value}
          onBlur={(e) =>
            onInputBlur({ row, col, value: e.currentTarget.value })
          }
        />
      ) : (
        <p className="text-ellipsis overflow-hidden text-nowrap">{value}</p>
      )}
    </TableCell>
  );
};

export default DataGridCell;
