// import { describe, expect, test, jest } from "@jest/globals";
// import { AwaitingConfirm, Client, Synchronized } from "./client";
// import { Operation } from "./operation";
// import { UUID } from "./identity";

// class TestClient extends Client {
//   sendOperation(revision: number, operation: Operation): void {}

//   applyServerAck(
//     operation: Operation,
//     processedOperation: Operation<UUID>
//   ): void {}

//   applyOperation(operation: Operation): void {}
// }

// describe("Client module", () => {
//   const testClient = new TestClient(1);
//   jest.spyOn(testClient, "sendOperation");
//   jest.spyOn(testClient, "applyOperation");
//   jest.spyOn(testClient, "applyClient");
//   jest.spyOn(testClient, "processServerAckOperation");
//   jest.spyOn(testClient, 'applyServer');
//   jest.spyOn(testClient, "applyServerAck");

//   test("test the `sendOperation`, `applyServerAck` and `applyOperation` callbacks.", () => {
//     const operation: Operation = {
//       updateCells: [
//         { colId: { uuid: "1" }, rowId: { uuid: "1" }, value: "first" },
//       ],
//       insertRows: [
//         {
//           id: { symbol: "symbol crated by the client side" },
//           data: [{ colId: { uuid: "new" }, value: "" }],
//         },
//       ],
//     };
//     expect(testClient.revision).toBe(1);
//     expect(testClient.state).toEqual(new Synchronized());
//     testClient.applyClient(operation);
//     expect(testClient.sendOperation).toHaveBeenCalledWith(1, operation);
//     expect(testClient.state).toEqual(new AwaitingConfirm(operation));

//     const serverOperation: Operation = {
//       updateCells: [
//         { colId: { uuid: "1" }, rowId: { uuid: "1" }, value: "second" },
//         { colId: { uuid: "1" }, rowId: { uuid: "2" }, value: "third" },
//       ],
//     };
//     testClient.applyServer(serverOperation);
//     expect(testClient.applyOperation).toHaveBeenCalledWith({
//       updateCells: [
//         { colId: { uuid: "1" }, rowId: { uuid: "2" }, value: "third" },
//       ],
//     });
//     expect(testClient.state).toEqual(
//       new AwaitingConfirm(operation)
//     );

//     const processedOperation: Operation<UUID> = {
//       updateCells: [
//         { colId: { uuid: "1" }, rowId: { uuid: "1" }, value: "first" },
//       ],
//       insertRows: [
//         {
//           id: { uuid: "uuid from the server", symbol: "symbol crated by the client side" },
//           data: [{ colId: { uuid: "new" }, value: "" }],
//         },
//       ],
//     };
//     testClient.applyServerAck(serverOperation, processedOperation);
//     expect(testClient.applyServerAck).toHaveBeenCalledWith(
//       serverOperation,
//       processedOperation
//     );
//     expect(testClient.state).toEqual(new Synchronized());
//   });

//   // test("test the `applyClient` method transitions state correctly.", () => {
//   //   const operation: Operation = {
//   //     updateCells: [
//   //       { colId: { uuid: "2" }, rowId: { uuid: "2" }, value: "fourth" },
//   //     ],
//   //   };
//   //   testClient.applyClient(operation);
//   //   expect(testClient.sendOperation).toHaveBeenCalledWith(1, operation);
//   //   expect(testClient.state).toEqual(new AwaitingConfirm(operation));
//   // });

//   // test("test the `applyServer` method transitions state correctly.", () => {
//   //   const serverOperation: Operation = {
//   //     updateCells: [
//   //       { colId: { uuid: "2" }, rowId: { uuid: "2" }, value: "fifth" },
//   //     ],
//   //   };
//   //   testClient.applyServer(serverOperation);
//   //   expect(testClient.applyOperation).toHaveBeenCalledWith(serverOperation);
//   //   expect(testClient.state).toEqual(new Synchronized());
//   // });

//   // test("test the `applyServerAck` method transitions state correctly.", () => {
//   //   const serverOperation: Operation = {
//   //     updateCells: [
//   //       { colId: { uuid: "2" }, rowId: { uuid: "2" }, value: "sixth" },
//   //     ],
//   //   };
//   //   const processedOperation: Operation<UUID> = {
//   //     updateCells: [
//   //       { colId: { uuid: "2" }, rowId: { uuid: "2" }, value: "sixth" },
//   //     ],
//   //   };
//   //   testClient.applyServerAck(serverOperation, processedOperation);
//   //   expect(testClient.applyServerAck).toHaveBeenCalledWith(
//   //     serverOperation,
//   //     processedOperation
//   //   );
//   //   expect(testClient.state).toEqual(new Synchronized());
//   // });
// });
import { describe, expect, test, jest } from "@jest/globals";
import {
  AwaitingConfirm,
  AwaitingWithBuffer,
  Client,
  Synchronized,
} from "./client";
import { Operation } from "./operation";
import { UUID } from "./identity";

class TestClient extends Client {
  sendOperation(revision: number, operation: Operation): void {}

  applyServerAck(
    operation: Operation,
    processedOperation: Operation<UUID>
  ): void {}

  applyOperation(operation: Operation): void {}
}

describe("Client module", () => {
  test("test the state of Client", () => {
    const testClient = new TestClient(1);
    jest.spyOn(testClient, "sendOperation");
    jest.spyOn(testClient, "applyOperation");

    expect(testClient.revision).toBe(1);
    expect(testClient.state).toEqual(new Synchronized());

    const operation: Operation = {
      updateCells: [
        { colId: { uuid: "1" }, rowId: { uuid: "1" }, value: "first" },
        { colId: { uuid: "3" }, rowId: { uuid: "3" }, value: "1" },
      ],
      insertRows: [
        {
          id: { symbol: "symbol crated by client side" },
          data: [{ colId: { uuid: "new" }, value: "" }],
        },
      ],
    };
    testClient.applyClient(operation);
    expect(testClient.sendOperation).toHaveBeenCalledWith(1, operation);
    expect(testClient.state).toEqual(new AwaitingConfirm(operation));

    const serverOperation: Operation = {
      updateCells: [
        { colId: { uuid: "1" }, rowId: { uuid: "1" }, value: "first 222" }, // this line should be dropped when applying the operation to the client.
        { colId: { uuid: "1" }, rowId: { uuid: "2" }, value: "third" },
      ],
    };
    testClient.applyServer(serverOperation);
    expect(testClient.revision).toBe(2);
    expect(testClient.applyOperation).toHaveBeenCalledWith({
      updateCells: [
        { colId: { uuid: "1" }, rowId: { uuid: "2" }, value: "third" },
      ],
    });
    expect(testClient.state).toEqual(new AwaitingConfirm(operation));

    const secondOperation: Operation = {
      deleteRows: [{ uuid: "3" }],
    };
    testClient.applyClient(secondOperation);
    expect(testClient.state).toEqual(
      new AwaitingWithBuffer(operation, secondOperation)
    );

    const serverAckOperation: Operation<UUID> = {
      updateCells: [
        { colId: { uuid: "1" }, rowId: { uuid: "1" }, value: "first" },
        { colId: { uuid: "3" }, rowId: { uuid: "3" }, value: "1" },
      ],
      insertRows: [
        {
          id: {
            uuid: "uuid from server side",
            symbol: "symbol crated by client side",
          },
          data: [{ colId: { uuid: "new" }, value: "" }],
        },
      ],
    };
    testClient.serverAck(serverAckOperation);
    expect(testClient.revision).toBe(3);
    expect(testClient.state).toEqual(new AwaitingConfirm(secondOperation));

    testClient.serverAck(secondOperation as Operation<UUID>);
    expect(testClient.state).toEqual(new Synchronized());
    expect(testClient.revision).toBe(4);
  });
});
