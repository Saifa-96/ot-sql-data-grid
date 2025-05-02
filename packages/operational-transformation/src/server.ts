import { transform, Operation } from "./operation";

export abstract class Server {
  operations: Operation[];

  constructor() {
    this.operations = [];
  }

  abstract applyOperation(operation: Operation): void;

  receiveOperation(revision: number, operation: Operation): Operation {
    let curtOp = operation;
    if (revision < 0 || this.operations.length < revision) {
      throw new Error("operation revision not in history");
    }

    const concurrentOperation = this.operations.slice(revision);
    for (const op of concurrentOperation) {
      const [op1] = transform(curtOp, op);
      curtOp = op1;
    }

    this.operations.push(curtOp);
    this.applyOperation(curtOp);
    return curtOp;
  }

  getRevision() {
    return this.operations.length;
  }
}
