import { Button } from "@/components/ui/button";
import { Users } from 'lucide-react';
import { FC } from "react";

interface EditorMenuBarProps {
  clientCount: number;
  onNewRecord: VoidFunction;
  onNewColumn: VoidFunction;
}

const EditorMenuBar: FC<EditorMenuBarProps> = (props) => {
  const { clientCount, onNewColumn, onNewRecord } = props;

  return (
    <div className="p-2 border-b flex justify-between items-center">
      <div className="space-x-2">
        <Button size="sm" variant="outline" onClick={onNewRecord}>New Record</Button>
        <Button size="sm" variant="outline" onClick={onNewColumn}>New Column</Button>
      </div>
      <div className="flex items-center space-x-2 mr-2">
        <Users size={20} />
        <span className="text-gray-500">{clientCount}</span>
      </div>
    </div>
  );
};

export default EditorMenuBar;
