import { type Operation, compose, transform } from "./operation";

export abstract class Client {
  revision: number;
  state: State;

  constructor(revision: number) {
    this.revision = revision;
    this.state = new Synchronized();
  }

  private setState(state: State) {
    this.state = state;
  }

  applyClient(operation: Operation) {
    this.setState(this.state.applyClient(this, operation));
  }

  applyServer(operation: Operation) {
    this.revision++;
    this.setState(this.state.applyServer(this, operation));
  }

  serverAck() {
    this.revision++;
    this.setState(this.state.serverAck(this));
  }

  abstract sendOperation(revision: number, operation: Operation): void;
  abstract applyOperation(operation: Operation): void;
}

interface State {
  applyClient(client: Client, operation: Operation): State;
  applyServer(client: Client, operation: Operation): State;
  serverAck(client: Client): State;
}

export class Synchronized implements State {
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

export class AwaitingConfirm implements State {
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

  serverAck() {
    return new Synchronized();
  }
}

export class AwaitingWithBuffer implements State {
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

  serverAck(client: Client) {
    client.sendOperation(client.revision, this.buffer);
    return new AwaitingConfirm(this.buffer);
  }
}
