import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AwaitingConfirm,
  AwaitingWithBuffer,
  ClientState,
  Operation,
  Synchronized,
} from "operational-transformation";
import "react-json-view-lite/dist/index.css";
import { match, P } from "ts-pattern";
import DataPreview from "./data-preview";
import DescriptionTooltip from "./description-tooltip";

export interface OperationDetail {
  id: string;
  action: string;
  revision: number;
  operation: Operation;
  state: ClientState;
}

interface OperationDetailItemProps {
  data: OperationDetail;
}

const OperationDetailItem: React.FC<OperationDetailItemProps> = (props) => {
  const { data } = props;
  return (
    <div className="p-2 border rounded-sm space-y-2">
      <div className="flex justify-between">
        <Badge>{data.action}</Badge>
        <span className="text-sm text-gray-600">revision: {data.revision}</span>
      </div>

      <div className="flex justify-between items-center">
        {match(data.state)
          .returnType<React.ReactNode>()
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

export default OperationDetailItem;
