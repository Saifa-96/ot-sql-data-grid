import {
  Client,
  Operation,
  UpdateCell,
  UUID,
} from "operational-transformation";
import { unshiftOperation } from "../jotai/client-operations-atom";

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
      this.applyOperation({ updateCells });
    }
  }

  applyClient(operation: Operation): void {
    this.applyOperation(operation);
    super.applyClient(operation);
    unshiftOperation({
      action: "apply-client",
      state: this.state,
      revision: this.revision,
      operation,
    });
  }

  sendOperation(revision: number, operation: Operation): void {
    this.events.sendOperation({ revision, operation });
  }

  applyServer(operation: Operation): void {
    super.applyServer(operation);
    unshiftOperation({
      action: "apply-server",
      state: this.state,
      revision: this.revision,
      operation,
    });
  }

  serverAck(operation: Operation<UUID>): void {
    super.serverAck(operation);
    unshiftOperation({
      action: "server-ack",
      state: this.state,
      revision: this.revision,
      operation,
    });
  }

  applyOperation(operation: Operation): void {
    this.events.applyOperation(operation);
  }
}
