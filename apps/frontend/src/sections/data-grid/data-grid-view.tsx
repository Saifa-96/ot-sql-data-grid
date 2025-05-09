import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table } from "@/components/ui/table";
import { forwardRef, PropsWithChildren } from "react";

interface DataGridProps {
  width: number;
  height: number;
}

const DataGridView = forwardRef<
  HTMLDivElement,
  PropsWithChildren<DataGridProps>
>(({ width, height, children }, ref) => {
  return (
    <ScrollArea
      type="always"
      ref={ref}
      className="relative"
      style={{ width, height }}
    >
      <ScrollBar orientation="horizontal" />
      <Table className="grid">{children}</Table>
    </ScrollArea>
  );
});
DataGridView.displayName = "DataGridView";

export default DataGridView;
