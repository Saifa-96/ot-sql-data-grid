import { Button } from "@/components/ui/button";
import { FC } from "react";

interface EditorMenuBarProps {
  onNewRecord: VoidFunction;
  onNewColumn: VoidFunction;
}

const EditorMenuBar: FC<EditorMenuBarProps> = (props) => {
  const { onNewColumn, onNewRecord } = props;

  return (
    <div className="p-2 border-b space-x-2">
      <Button size="sm" variant="outline" onClick={onNewRecord}>New Record</Button>
      <Button size="sm" variant="outline" onClick={onNewColumn}>New Column</Button>
    </div>
  );
};

export default EditorMenuBar;
