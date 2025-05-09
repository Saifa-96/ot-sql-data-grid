import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { defaultStyles, JsonView } from "react-json-view-lite";

interface DataPreviewProps {
  name?: string;
  data: object | Array<unknown>;
}

const DataPreview: React.FC<React.PropsWithChildren<DataPreviewProps>> = (
  props
) => {
  return (
    <HoverCard>
      <HoverCardTrigger>
        {props.name ? (
          <h4 className="text-xs font-semibold cursor-pointer">{props.name}</h4>
        ) : (
          props.children
        )}
      </HoverCardTrigger>
      <HoverCardContent className="p-0 w-80">
        <JsonView
          clickToExpandNode
          data={props.data}
          shouldExpandNode={shouldExpandNode}
          style={defaultStyles}
        />
      </HoverCardContent>
    </HoverCard>
  );
};

const shouldExpandNode = (level: number) => level === 0;

export default DataPreview;
