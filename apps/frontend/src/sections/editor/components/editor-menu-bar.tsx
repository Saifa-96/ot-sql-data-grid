import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
} from "@/components/ui/menubar";
import { FC } from "react";

interface EditorMenuBarProps {
  onNewRecord: () => void;
  onNewColumn: () => void;
}

const EditorMenuBar: FC<EditorMenuBarProps> = (props) => {
  const { onNewColumn, onNewRecord } = props;

  return (
    <div className="p-2 border-b">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Add</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => onNewRecord()}>New Record</MenubarItem>
            <MenubarItem onClick={() => onNewColumn()}>New Column</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};

export default EditorMenuBar;
