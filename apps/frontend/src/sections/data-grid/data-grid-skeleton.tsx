import { Skeleton } from "@/components/ui/skeleton";

interface DataGridSkeletonProps {
  width: number;
  height: number;
  rowHeight: number;
}
const DataGridSkeleton: React.FC<DataGridSkeletonProps> = ({
  width,
  height,
  rowHeight,
}) => {
  const rowCount = Math.ceil(height / rowHeight);
  return (
    <div className="p-2 overflow-hidden" style={{ width, height }}>
      {Array(rowCount)
        .fill(null)
        .map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-center"
            style={{ height: rowHeight }}
          >
            <Skeleton className="w-full h-[20px]" />
          </div>
        ))}
    </div>
  );
};

export default DataGridSkeleton;
