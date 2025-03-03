import { UUID } from "./identity";
import { type Operation, compose, getClientSymbolMap, mapClientSymbolToUUID, transform } from "./operation";

export abstract class Client {
  revision: number;
  state: ClientState;

  constructor(revision: number) {
    this.revision = revision;
    this.state = new Synchronized();
  }

  private setState(state: ClientState) {
    this.state = state;
  }

  applyClient(operation: Operation) {
    this.setState(this.state.applyClient(this, operation));
  }

  applyServer(operation: Operation) {
    this.revision++;
    this.setState(this.state.applyServer(this, operation));
  }

  serverAck(operation: Operation<UUID>) {
    this.revision++;
    this.setState(this.state.serverAck(this, operation));
  }

  processServerAckOperation(ackOperation: Operation<UUID>, outstanding: Operation): Operation<UUID> {
    const symbolMap = getClientSymbolMap(ackOperation);
    const op = mapClientSymbolToUUID(outstanding, ({ symbol }) => {
      const uuid = symbolMap.get(symbol);
      if (uuid === undefined) {
        throw new Error("symbol not found in the map");
      }
      return { uuid, symbol };
    })
    return op;
  }

  abstract sendOperation(revision: number, operation: Operation): void;
  abstract applyOperation(operation: Operation): void;
  abstract applyServerAck(operation: Operation, processedOperation: Operation<UUID>): void;
}

export interface ClientState {
  applyClient(client: Client, operation: Operation): ClientState;
  applyServer(client: Client, operation: Operation): ClientState;
  serverAck(client: Client, operation: Operation<UUID>): ClientState;
}

export class Synchronized implements ClientState {
  applyClient(client: Client, operation: Operation) {
    client.sendOperation(client.revision, operation);
    return new AwaitingConfirm(operation);
  }

  applyServer(client: Client, operation: Operation) {
    client.applyOperation(operation);
    return this;
  }

  serverAck() {
    throw new Error("The state is synchronized.");
    return this;
  }
}

export class AwaitingConfirm implements ClientState {
  outstanding: Operation;

  constructor(outstanding: Operation) {
    this.outstanding = outstanding;
  }

  applyClient(_: Client, operation: Operation) {
    return new AwaitingWithBuffer(this.outstanding, operation);
  }

  applyServer(client: Client, operation: Operation) {
    const pair = transform(this.outstanding, operation);
    client.applyOperation(pair[1]);
    return new AwaitingConfirm(pair[0]);
  }

  serverAck(client: Client, operation: Operation<UUID>) {
    const op = client.processServerAckOperation(operation, this.outstanding);
    client.applyServerAck(this.outstanding, op);
    return new Synchronized();
  }
}

export class AwaitingWithBuffer implements ClientState {
  outstanding: Operation;
  buffer: Operation;

  constructor(outstanding: Operation, buffer: Operation) {
    this.outstanding = outstanding;
    this.buffer = buffer;
  }

  applyClient(_: Client, operation: Operation) {
    const buffer = compose(this.buffer, operation);
    this.buffer = buffer;
    return this;
  }

  applyServer(client: Client, operation: Operation) {
    const pair1 = transform(this.outstanding, operation);
    const pair2 = transform(this.buffer, pair1[1]);
    client.applyOperation(pair2[1]);
    return new AwaitingWithBuffer(pair1[0], pair2[0]);
  }

  serverAck(client: Client, operation: Operation<UUID>) {
    const op = client.processServerAckOperation(operation, this.outstanding);
    client.sendOperation(client.revision, this.buffer);
    client.applyServerAck(this.outstanding, op);
    return new AwaitingConfirm(this.buffer);
  }
}
