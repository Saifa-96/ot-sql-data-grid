import { Operation, transform } from "./operation";

export abstract class Server {
  operations: Operation[];

  constructor() {
    this.operations = [];
  }

  abstract applyOperation(operation: Operation): Operation;

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
    this.operations.push(curOp);
    const result = this.applyOperation(curOp);

    return result;
  }

  getRevision() {
    return this.operations.length;
  }

  // toBuffer() {
  //   const dbU8Arr = this.db.export();
  //   const revision = this.getRevision();
  //   return new Uint8Array([revision, ...dbU8Arr]);
  // }
}

// function applyOperation(db: Database, operation: Operation) {
//   const newOp = { ...operation };
//   const symbolMap: Map<string, string> = new Map();

//   if (newOp.deleteRows) {
//     const deleteIds = newOp.deleteRows.map(getIDinIdentity).filter(isString);
//     store.deleteUsers(db, deleteIds);
//   }

//   // Apply deleteCols operation
//   if (newOp.deleteCols) {
//     const deleteIds = newOp.deleteCols.map(getIDinIdentity).filter(isString);
//     store.deleteCols(db, deleteIds);
//   }

//   // Apply insertCols operation
//   if (newOp.insertCols) {
//     const insertCols = newOp.insertCols.map<InsertCol<IdentityWithID>>((i) => {
//       if (isClientSymbol(i.id)) {
//         const idStr = faker.string.uuid().slice(0, 7);
//         symbolMap.set(i.id.symbol, idStr);
//         const identity = toIdentityWithID(i.id, idStr);
//         return { ...i, id: identity };
//       } else {
//         return i as InsertCol<IdentityWithID>;
//       }
//     });

//     insertCols.forEach(({ id, colName }) => {
//       store.insertColumn(db, id.id, colName);
//     });
//     newOp.insertCols = insertCols;
//   }

//   // Apply insertRows operation
//   if (newOp.insertRows) {
//     const insertRows = newOp.insertRows.map<InsertRow<IdentityWithID>>((i) => {
//       if (isClientSymbol(i.id)) {
//         const idStr = faker.string.uuid().slice(0, 7);
//         symbolMap.set(i.id.symbol, idStr);
//         const identity = toIdentityWithID(i.id, idStr);
//         return {
//           id: identity,
//           data: i.data.map(({ colId, value }) => {
//             if (isClientSymbol(colId)) {
//               const colIdStr = symbolMap.get(colId.symbol);
//               if (isString(colIdStr)) {
//                 return { colId: toIdentityWithID(colId, colIdStr), value };
//               }
//             }

//             throw new Error("colId is not a string");
//           }),
//         };
//       } else {
//         return i as InsertRow<IdentityWithID>;
//       }
//     });
//     newOp.insertRows = insertRows;

//     insertRows.forEach(({ id, data }) => {
//       const rowData = data.reduce((acc, { colId, value }) => {
//         acc[colId.id] = value;
//         return acc;
//       }, {} as Record<string, unknown>);
//       store.addUsers(db, [{ id: id.id, ...rowData }]);
//     });
//   }

//   // Apply updateCells operation
//   if (newOp.updateCells) {
//     const updateCells = newOp.updateCells.map<UpdateCell<IdentityWithID>>(
//       (i) => {
//         const rowId = isClientSymbol(i.rowId)
//           ? symbolMap.get(i.rowId.symbol)
//           : getIDinIdentity(i.rowId);
//         const colId = isClientSymbol(i.colId)
//           ? symbolMap.get(i.colId.symbol)
//           : getIDinIdentity(i.colId);

//         if (isString(rowId) && isString(colId)) {
//           return {
//             rowId: { id: rowId, symbol: i.rowId.symbol },
//             colId: { id: colId, symbol: i.colId.symbol },
//             value: i.value,
//           };
//         }

//         throw new Error("rowId or colId is not a string");
//       }
//     );
//     updateCells.forEach(({ rowId, colId, value }) => {
//       store.updateUserAttr(db, colId.id, rowId.id, value);
//     });

//     newOp.updateCells = updateCells;
//   }

//   return newOp;
// }
