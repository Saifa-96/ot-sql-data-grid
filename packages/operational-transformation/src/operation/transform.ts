import { identityToString } from "./identity";
import { Operation } from "./operation";
import { RecordChangesCollection } from "./record-changes-collection";

/**
 * Transform two concurrent operations to ensure convergence.
 * Given operations A and B that happened concurrently, transform
 * produces A' and B' such that apply(apply(S, A), B') = apply(apply(S, B), A')
 *
 * @param currentOp - Operation executed on client
 * @param receivedOp - Operation received from server
 * @returns [transformedCurrentOp, transformedReceivedOp]
 */
export const transform = (
  currentOp: Operation,
  receivedOp: Operation
): [Operation, Operation] => {
  const currentOpPrime: Operation = {};
  const receivedOpPrime: Operation = {};

  // Transform DDL operations
  const [ddlCurrentPrime, ddlReceivedPrime] = transformDDL(
    currentOp,
    receivedOp
  );
  Object.assign(currentOpPrime, ddlCurrentPrime);
  Object.assign(receivedOpPrime, ddlReceivedPrime);

  // Transform DML operations
  const [dmlCurrentPrime, dmlReceivedPrime] = transformDML(
    currentOp,
    receivedOp
  );
  Object.assign(currentOpPrime, dmlCurrentPrime);
  Object.assign(receivedOpPrime, dmlReceivedPrime);

  return [currentOpPrime, receivedOpPrime];
};

/**
 * Transform DDL operations (column insertions, updates, deletions)
 */
const transformDDL = (
  currentOp: Operation,
  receivedOp: Operation
): [Operation, Operation] => {
  const currentOpPrime: Operation = {};
  const receivedOpPrime: Operation = {};

  const currentDeleteColumnsSet = new Set(currentOp.deleteColumns);
  const receivedDeleteColumnsSet = new Set(receivedOp.deleteColumns);
  // 1. Handle updateColumns{}
  if (currentOp.updateColumns || receivedOp.updateColumns) {
    const currentUpdateColumns: Operation["updateColumns"] = {};
    const receivedUpdateColumns: Operation["updateColumns"] = {};

    // Process received operation's update columns
    if (receivedOp.updateColumns) {
      for (const column in receivedOp.updateColumns) {
        // Skip if column was deleted by current operation
        if (currentDeleteColumnsSet.has(column)) continue;

        // Add to transformed operation
        receivedUpdateColumns[column] = { ...receivedOp.updateColumns[column] };
      }
    }

    // Process current operation's update columns
    if (currentOp.updateColumns) {
      for (const column in currentOp.updateColumns) {
        // Skip if column was deleted or updated by received operation
        if (receivedDeleteColumnsSet.has(column)) continue;
        if (column in receivedUpdateColumns) continue;

        // Add to transformed operation
        currentUpdateColumns[column] = { ...currentOp.updateColumns[column] };
      }
    }

    // Resolve conflicts - merge properties with a deterministic rule
    // for (const column in currentUpdateColumns) {
    //   if (column in receivedUpdateColumns) {
    //   }
    // }

    if (Object.keys(currentUpdateColumns).length > 0) {
      currentOpPrime.updateColumns = currentUpdateColumns;
    }

    if (Object.keys(receivedUpdateColumns).length > 0) {
      receivedOpPrime.updateColumns = receivedUpdateColumns;
    }
  }

  // 2. Handle insertColumns
  if (currentOp.insertColumns || receivedOp.insertColumns) {
    // Remove columns that are deleted by the other operation
    const currentInsertColumns = { ...currentOp.insertColumns };
    const receivedInsertColumns = { ...receivedOp.insertColumns };

    // Remove insertions that are deleted by the other operation
    for (const column in currentInsertColumns) {
      if (receivedDeleteColumnsSet.has(column)) {
        delete currentInsertColumns[column];
      }
    }

    for (const column in receivedInsertColumns) {
      if (currentDeleteColumnsSet.has(column)) {
        delete receivedInsertColumns[column];
      }
    }

    // Handle column insertion conflicts - last writer wins based on some deterministic criteria
    for (const column in currentInsertColumns) {
      if (column in receivedInsertColumns) {
        const change = receivedInsertColumns[column];
        delete currentInsertColumns[column];
        delete receivedInsertColumns[column];
        if (receivedOpPrime.updateColumns) {
          receivedOpPrime.updateColumns[column] = change;
        } else {
          receivedOpPrime.updateColumns = { [column]: change };
        }
      }
    }

    if (Object.keys(currentInsertColumns).length > 0) {
      currentOpPrime.insertColumns = currentInsertColumns;
    }

    if (Object.keys(receivedInsertColumns).length > 0) {
      receivedOpPrime.insertColumns = receivedInsertColumns;
    }
  }

  // 3. Handle deleteColumns
  // Both operations keep their deleteColumns, but we track them for later use
  if (currentOp.deleteColumns && currentOp.deleteColumns.length > 0) {
    currentOpPrime.deleteColumns = [...currentOp.deleteColumns];
  }

  if (receivedOp.deleteColumns && receivedOp.deleteColumns.length > 0) {
    receivedOpPrime.deleteColumns = [...receivedOp.deleteColumns];
  }

  return [currentOpPrime, receivedOpPrime];
};

/**
 * Transform DML operations (record insertions, updates, deletions)
 */
const transformDML = (
  curtOp: Operation,
  recvOp: Operation
): [Operation, Operation] => {
  const curtOpPrime: Operation = {};
  const recvOpPrime: Operation = {};

  if (curtOp.insertRecords) {
    curtOpPrime.insertRecords = [...curtOp.insertRecords];
  }

  if (recvOp.insertRecords) {
    recvOpPrime.insertRecords = [...recvOp.insertRecords];
  }

  if (curtOp.updateRecords || recvOp.updateRecords) {
    const curtUpdateRecords = new RecordChangesCollection(
      curtOp.updateRecords
    ).execPrune(recvOp.deleteRecords, recvOp.deleteColumns);
    const recvUpdateRecords = new RecordChangesCollection(
      recvOp.updateRecords
    ).execPrune(curtOp.deleteRecords, curtOp.deleteColumns);
    RecordChangesCollection.transform(curtUpdateRecords, recvUpdateRecords);

    if (!curtUpdateRecords.isEmpty()) {
      curtOpPrime.updateRecords = curtUpdateRecords.toRecordChangesArray();
    }
    if (!recvUpdateRecords.isEmpty()) {
      recvOpPrime.updateRecords = recvUpdateRecords.toRecordChangesArray();
    }
  }

  if (curtOp.deleteRecords) {
    curtOpPrime.deleteRecords = [...curtOp.deleteRecords];
  }

  if (recvOp.deleteRecords) {
    const deleteSet = new Set(
      curtOpPrime.deleteRecords?.map(identityToString) ?? []
    );
    recvOpPrime.deleteRecords = [...recvOp.deleteRecords].filter(
      (id) => !deleteSet.has(identityToString(id))
    );
  }

  return [curtOpPrime, recvOpPrime];
};
