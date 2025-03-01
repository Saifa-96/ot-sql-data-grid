import {
  Client,
  Operation,
  UpdateCell,
  UUID,
} from "operational-transformation";

interface EditorClientParams {
  revision: number;
  events: Events;
}

interface Events {
  sendOperation: (params: { revision: number; operation: Operation }) => void;
  applyOperation: (op: Operation) => void;
}

export class EditorClient extends Client {
  events: Events;

  constructor(params: EditorClientParams) {
    const { revision, events } = params;
    super(revision);
    this.events = events;
  }

  applyServerAck(_: Operation, processedOperation: Operation<UUID>): void {
    if (processedOperation.insertRows) {
      const updateCells = processedOperation.insertRows
        .filter((item) => !!item.id.symbol)
        .map<UpdateCell>((item) => {
          return {
            colId: { uuid: "id" },
            rowId: { uuid: item.id.symbol! },
            value: item.id.uuid,
          };
        });
      console.log("apply server ack: ", updateCells);
      this.applyOperation({ updateCells });
    }
  }

  applyClient(operation: Operation): void {
    console.log("apply client", operation);
    this.applyOperation(operation);
    super.applyClient(operation);
  }

  sendOperation(revision: number, operation: Operation): void {
    this.events.sendOperation({ revision, operation });
  }

  applyOperation(operation: Operation): void {
    this.events.applyOperation(operation);
  }
}
