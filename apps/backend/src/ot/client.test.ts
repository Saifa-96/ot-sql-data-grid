import { describe, expect, test, jest } from "@jest/globals";
import { AwaitingConfirm, Client, Synchronized } from "./client";
import { Operation } from "./operation/types";

class TestClient extends Client {
  sendOperation(revision: number, operation: Operation): void {}

  applyOperation(operation: Operation): void {}
}

describe("Client module", () => {
  const testClient = new TestClient(1);
  jest.spyOn(testClient, "sendOperation");
  jest.spyOn(testClient, "applyOperation");

  test("test the `sendOperation` and `applyOperation` callbacks.", () => {
    const operation: Operation = {
      updateCells: [{ colId: { id: "1" }, rowId: { id: "1" }, value: "first" }],
    };
    expect(testClient.revision).toBe(1);
    expect(testClient.state).toEqual(new Synchronized());
    testClient.applyClient(operation);
    expect(testClient.sendOperation).toHaveBeenCalledWith(1, operation);
    expect(testClient.state).toEqual(new AwaitingConfirm(operation));

    const serverOperation: Operation = {
      updateCells: [
        { colId: { id: "1" }, rowId: { id: "1" }, value: "second" },
        { colId: { id: "1" }, rowId: { id: "2" }, value: "third" },
      ],
    };
    testClient.applyServer(serverOperation);
    expect(testClient.applyOperation).toHaveBeenCalledWith({
        updateCells: [
            { colId: { id: "1" }, rowId: { id: "2" }, value: "third" },
        ],
    });
    expect(testClient.revision).toBe(2);
    expect(testClient.state).toEqual(new AwaitingConfirm(operation));
  });
});
