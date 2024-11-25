import { Operation } from "./operation";

interface ClientState {
  applyClient(client: Client, operation: Operation): ClientState;
  applyServer(client: Client, operation: Operation): ClientState;
  serverAck(client: Client): ClientState;
  transformSelection(selection: unknown): unknown;
}

class AwaitingConfirm implements ClientState {
  outstanding: Operation;

  constructor(outstanding: Operation) {
    this.outstanding = outstanding;
  }

  applyClient(_: Client, operation: Operation): ClientState {
    return new AwaitingWithBuffer(this.outstanding, operation);
  }

  applyServer(client: Client, operation: Operation): ClientState {
    const pair = operation.constructor.transform(this.outstanding, operation);
    client.applyOperation(pair[1]);
    return new AwaitingConfirm(pair[0]);
  }

  serverAck(_: Client): ClientState {
    return _synchronized;
  }

  transformSelection(selection: unknown): unknown {
      return selection.transform(this.outstanding);
  }

  resend(client: Client) {
    client.sendOperation(client.revision, this.outstanding);
  }
}

class Synchronized implements ClientState {
  applyClient(client: Client, operation: Operation): ClientState {
    client.sendOperation(client.revision, operation);
    return new AwaitingConfirm(operation);
  }

  applyServer(client: Client, operation: Operation): ClientState {
    client.applyServer(operation);
    return this;
  }

  serverAck() {
    throw new Error("There is no pending operation.");
    return this;
  }

  transformSelection(selection: unknown) {
    return selection;
  }
}

const _synchronized = new Synchronized();

export class Client {
  revision: number;
  state: ClientState;
  constructor(revision: number) {
    this.revision = revision;
    this.state = _synchronized;
  }

  setState(state: ClientState) {
    this.state = state;
  }

  applyClient(operation: Operation) {
    this.setState(this.state.applyClient(this, operation));
  }

  applyServer(operation) {
    this.revision++;
    this.setState(this.state.applyServer(this, operation));
  }

  serverAck() {
    this.revision++;
    this.setState(this.state.serverAck());
  }

  serverReconnect() {
    if (typeof this.state.resend === "function") {
      this.state.resend(this);
    }
  }

  transformSelection(selection: unknown) {
    return this.state.transformSelection(selection);
  }

  sendOperation(revision: number, operation: Operation) {
    console.log(revision, operation);
    // Override this method.
  }

  applyOperation(revision: number, operation?: Operation) {
    console.log(revision, operation);
    // Override this method.
  }
}
