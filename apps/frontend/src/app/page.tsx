import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DataGridSkeleton from "@/sections/data-grid/data-grid-skeleton";
import { EditorStateProvider } from "@/sections/use-editor-state";
import dynamic from "next/dynamic";

export const revalidate = 0;
export default async function Home() {
  return (
    <EditorStateProvider>
      <main className="my-8 flex flex-col gap-4 justify-center items-center">
        <div className="w-[1200px]">
          <ul className="list-inside list-decimal -mb-1 text-gray-500 text-sm">
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
        </div>

        <div className="flex gap-4 items-stretch">
          <Card className="overflow-hidden">
            <MenuBar />
            <DataGrid />
            <StatusBar />
          </Card>

          <AIChatPanel />
        </div>

        <div className="h-[500px] flex gap-4">
          <ServerOperations />
          <ClientOperations />
        </div>

        <RecordFormDialog />
        <ColumnFormDialog />
      </main>
    </EditorStateProvider>
  );
}

const DataGrid = dynamic(() => import("@/sections/data-grid/data-grid"), {
  ssr: false,
  loading: () => <DataGridSkeleton width={800} height={800} rowHeight={36} />,
});

const StatusBar = dynamic(() => import("@/sections/status-bar"), {
  ssr: false,
  loading: () => <Skeleton className="h-8" />,
});

const MenuBar = dynamic(() => import("@/sections/menu-bar"), {
  ssr: false,
  loading: () => (
    <div className="p-2 border-b flex justify-between items-center">
      <div className="flex gap-2">
        <Skeleton className="w-[94px] h-[32px]" />
        <Skeleton className="w-[94px] h-[32px]" />
        <Skeleton className="w-[94px] h-[32px]" />
      </div>
    </div>
  ),
});

const AIChatPanel = dynamic(() => import("@/sections/ai-chat-panel"), {
  loading: () => (
    <div className="w-[400px] space-y-4">
      <Skeleton className="h-[737px]" />
      <Skeleton className="h-[126px]" />
    </div>
  ),
});

const ServerOperations = dynamic(
  () => import("@/sections/detail-panel/server-operations"),
  {
    loading: () => <Skeleton className="w-[800px] h-full" />,
  }
);

const ClientOperations = dynamic(
  () => import("@/sections/detail-panel/client-operations"),
  {
    loading: () => <Skeleton className="w-[400px] h-full" />,
  }
);

const RecordFormDialog = dynamic(
  () => import("@/sections/modal/record-form-dialog")
);

const ColumnFormDialog = dynamic(
  () => import("@/sections/modal/column-form-dialog")
);
