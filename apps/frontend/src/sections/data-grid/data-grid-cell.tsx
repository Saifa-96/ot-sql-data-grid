import { TableCell } from "@/components/ui/table";
import { cva, VariantProps } from "class-variance-authority";

export interface CellData {
  row: string;
  col: string;
  value: string;
}

interface DataGridCellProps
  extends React.HTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof cellVariants> {
  row: string;
  col: string;
  selected?: boolean;
  disabled?: boolean;
  value: string;
  onSelectCell: (params: CellData) => void;
  onInputBlur: (params: CellData) => void;
}

const DataGridCell: React.FC<DataGridCellProps> = ({
  row,
  col,
  selected,
  disabled,
  value,
  onInputBlur,
  onSelectCell,
  type,
  ...rest
}) => {
  return (
    <TableCell
      className={cellVariants({ type })}
      onDoubleClick={() => {
        if (!disabled) {
          onSelectCell({ row, col, value });
        }
      }}
      {...rest}
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

const cellVariants = cva("flex", {
  variants: {
    type: {
      standard: "",
      inserted: "bg-green-100 text-green-800",
      deleted: "bg-red-100 text-red-800",
      updated: "bg-yellow-100 text-yellow-800",
    },
  },
  defaultVariants: {
    type: "standard",
  },
});

export default DataGridCell;
