import { Operation, transform } from "./operation";
import { UUID } from './identity';

export abstract class Server {
  operations: Operation[];

  constructor() {
    this.operations = [];
  }

  abstract applyOperation(operation: Operation): Operation;

  abstract consumeClientSymbols(operation: Operation): Operation<UUID>

  receiveOperation(revision: number, operation: Operation) {
    let curOp = operation;
    if (revision < 0 || this.operations.length < revision) {
      throw new Error("operation revision not in history");
    }

    const concurrentOperation = this.operations.slice(revision);
    for (const op of concurrentOperation) {
      const [op1] = transform(curOp, op);
      curOp = op1;
    }

    const processedOp = this.consumeClientSymbols(curOp);
    this.operations.push(processedOp);
    const result = this.applyOperation(processedOp);
    return result;
  }

  getRevision() {
    return this.operations.length;
  }
}
