import {
  FC,
  memo,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { JsonView, defaultStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  OperationDetail,
  useClientOperations,
} from "../jotai/client-operations-atom";
import { Badge } from "@/components/ui/badge";
import { match, P } from "ts-pattern";
import {
  AwaitingConfirm,
  AwaitingWithBuffer,
  Operation,
  Synchronized,
  UUID,
} from "operational-transformation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { cva, VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import SocketManager from "../state/socket-manager";
import { Button } from "@/components/ui/button";

interface DetailPanelProps {
  socketMgr: SocketManager;
}

const DetailPanel: FC<DetailPanelProps> = ({ socketMgr }) => {
  const changes = useClientOperations();
  const [serverOperations, setServerOperations] = useState<Operation<UUID>[]>(
    []
  );

  useEffect(() => {
    const set = (ops: Operation<UUID>[]) => {
      setServerOperations(ops);
    };
    socketMgr.listenEvents({
      allOperations: set,
    });
    socketMgr.getAllOperations();

    return () => {
      socketMgr.offListenEvents({
        allOperations: set,
      });
    };
  }, [socketMgr]);

  return (
    <div className="w-[300px] flex flex-col space-y-4 overflow-hidden">
      <SectionCard title="Client State">
        <div className="p-2 space-y-2">
          {changes.map((change) => (
            <OperationDetailItem key={change.id} data={change} />
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Server State">
        <div className="grid grid-cols-7 gap-1 p-2">
          {serverOperations.map((so, index) => (
            <DataPreview key={index} data={so}>
              <Button variant="outline" size="icon">
                {index + 1}
              </Button>
            </DataPreview>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export default memo(DetailPanel);

interface ListProps {
  title: string;
}

const SectionCard: FC<PropsWithChildren<ListProps>> = (props) => {
  const { title, children } = props;
  return (
    <Card className="flex-1 box-border">
      <div className="flex flex-col flex-1 h-full">
        <h1 className="font-bold py-3 px-4 border-b">{title}</h1>
        <div className="flex-1 relative">
          <div className="flex-1 absolute top-0 left-0 bottom-0 right-0">
            <ScrollArea className="h-full">{children}</ScrollArea>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface ListItemProps {
  data: OperationDetail;
}

const OperationDetailItem: FC<ListItemProps> = (props) => {
  const { data } = props;
  return (
    <div className="p-2 border rounded-sm space-y-2">
      <div className="flex justify-between">
        <Badge>{data.action}</Badge>
        <span className="text-sm text-gray-600">revision: {data.revision}</span>
      </div>

      <div className="flex justify-between items-center">
        {match(data.state)
          .returnType<ReactNode>()
          .with(P.instanceOf(Synchronized), () => (
            <DescriptionTooltip
              variant="green"
              title="Synchronized"
              content="When the state is `Synchronized`, it means that the client's DB has been successfully synchronized with the server's DB."
            />
          ))
          .with(P.instanceOf(AwaitingConfirm), (ac) => (
            <>
              <DescriptionTooltip
                variant="blue"
                title="AwaitingConfirm"
                content="When the state is `AwaitingConfirm`, it means that the client's DB changes (outstanding) have been sent to the server and are awaiting confirmation."
              />

              <DataPreview name="outstanding" data={ac.outstanding} />
            </>
          ))
          .with(P.instanceOf(AwaitingWithBuffer), (awb) => (
            <>
              <DescriptionTooltip
                variant="orange"
                title="AwaitingWithBuffer"
                content="When the state is `AwaitingWithBuffer`, it means that the client's DB changes (outstanding) are awaiting synchronization while the client applies new changes stored in the buffer."
              />

              <div className="flex h-4 items-center space-x-1">
                <DataPreview name="buffer" data={awb.outstanding} />
                <Separator orientation="vertical" />
                <DataPreview name="outstanding" data={awb.buffer} />
              </div>
            </>
          ))
          .otherwise(() => "unknown")}
      </div>
    </div>
  );
};

const dotVariant = cva("flex h-2 w-2 rounded-full mr-2", {
  variants: {
    variant: {
      green: "bg-green-500",
      blue: "bg-blue-500",
      orange: "bg-orange-500",
    },
  },
});

interface DescriptionTooltipProps extends VariantProps<typeof dotVariant> {
  title: string;
  content: string;
}

const DescriptionTooltip: FC<DescriptionTooltipProps> = (props) => {
  const { title, content, variant } = props;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <p className="flex items-center">
            <span className={cn(dotVariant({ variant }))} />
            <span className="text-xs text-gray-600">{title}</span>
          </p>
        </TooltipTrigger>
        <TooltipContent>
          <p className="w-96">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface DataPreviewProps {
  name?: string;
  data: object;
}

const DataPreview: FC<PropsWithChildren<DataPreviewProps>> = (props) => {
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
