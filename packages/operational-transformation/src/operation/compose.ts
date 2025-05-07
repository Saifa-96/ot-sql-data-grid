import { Operation } from "./operation";
import { RecordChangesCollection } from "./record-changes-collection";

// Compose merges two consecutive operations into one operation, that
// preserves the changes of both. Or, in other words, for each change S
// and a pair of consecutive operations A and B,
// apply(apply(S, A), B) = apply(S, compose(A, B)) must hold.
export const compose = (curt: Operation, next: Operation): Operation => {
  const newOp: Operation = {};
  // ddl
  const resultDDL = composeDDL(curt, next);
  Object.assign(newOp, resultDDL);

  // dml
  const resultDML = composeDML(curt, next);
  Object.assign(newOp, resultDML);

  return newOp;
};

const composeDDL = (curt: Operation, next: Operation) => {
  const deleteColumns = [...(curt.deleteColumns ?? [])];
  const insertColumns = { ...curt.insertColumns };
  const updateColumns = { ...curt.updateColumns };

  for (const name of next.deleteColumns ?? []) {
    if (updateColumns[name]) {
      delete updateColumns[name];
    }
    if (insertColumns[name]) {
      delete insertColumns[name];
      continue;
    }
    deleteColumns.push(name);
  }

  for (const name in next.updateColumns) {
    const change = next.updateColumns[name];
    if (name in updateColumns) {
      const oldChange = updateColumns[name];
      updateColumns[name] = { ...oldChange, ...change };
    } else {
      updateColumns[name] = change;
    }
  }

  for (const name in next.insertColumns) {
    insertColumns[name] = next.insertColumns[name];
  }

  const newOp: Operation = {};
  if (deleteColumns.length > 0) {
    newOp.deleteColumns = deleteColumns;
  }
  if (Object.keys(insertColumns).length > 0) {
    newOp.insertColumns = insertColumns;
  }
  if (Object.keys(updateColumns).length > 0) {
    newOp.updateColumns = updateColumns;
  }
  return newOp;
};

const composeDML = (curt: Operation, next: Operation): Operation => {
  const updateRecords = new RecordChangesCollection([
    ...(curt.updateRecords ?? []),
    ...(next.updateRecords ?? []),
  ])
    .prune(next.deleteRecords, next.deleteColumns)
    .toRecordChangesArray();

  const insertRecordCollection = new RecordChangesCollection([
    ...(curt.insertRecords ?? []),
    ...(next.insertRecords ?? []),
  ]).prune(next.deleteRecords, next.deleteColumns);
  const insertRecord = insertRecordCollection.toRecordChangesArray();

  const deleteRecords = [...(curt.deleteRecords ?? [])].concat(
    insertRecordCollection.getRemainDeleteRecords()
  );

  const newOp: Operation = {};
  if (updateRecords.length > 0) {
    newOp.updateRecords = updateRecords;
  }
  if (insertRecord.length > 0) {
    newOp.insertRecords = insertRecord;
  }
  if (deleteRecords.length > 0) {
    newOp.deleteRecords = deleteRecords;
  }
  return newOp;
};
