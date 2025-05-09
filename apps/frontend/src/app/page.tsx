import { Card } from "@/components/ui/card";
import AIChatPanel from "@/sections/ai-chat-panel";
import DataGrid from "@/sections/data-grid";
import ClientOperations from "@/sections/detail-panel/client-operations";
import ServerOperations from "@/sections/detail-panel/server-operations";
import { EditorContextProvider } from "@/sections/editor-context";
import MenuBar from "@/sections/menu-bar";
import ColumnFormDialog from "@/sections/modal/column-form-dialog";
import RecordFormDialog from "@/sections/modal/record-form-dialog";
import StatusBar from "@/sections/status-bar";

export const revalidate = 0;
export default async function Home() {
  return (
    <EditorContextProvider>
      <main className="my-8 flex flex-col gap-4 justify-center items-center">
        <div className="flex gap-4 items-stretch">
          {/* <div>
            <ul className="list-inside list-decimal mb-3 text-gray-500 text-sm">
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
          </div> */}

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
      </main>

      <RecordFormDialog />
      <ColumnFormDialog />
    </EditorContextProvider>
  );
}
