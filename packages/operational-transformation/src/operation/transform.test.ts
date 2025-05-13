import { describe, expect, test } from "@jest/globals";
import { Operation } from "./operation";
import { transform } from "./transform";
import { RecordChanges } from "./record-changes-collection";

describe("Test transform", () => {
  test("Test Replacing update columns", () => {
    const currentOperation: Operation = {
      updateColumns: {
        name: {
          name: "name",
          displayName: "Name",
          width: 100,
          orderBy: 10000,
        },
      },
    };

    const receivedOperation: Operation = {
      updateColumns: {
        name: {
          name: "name",
          displayName: "Name",
          width: 200,
          orderBy: 20000,
        },
      },
    };

    const [curt, received] = transform(currentOperation, receivedOperation);
    expect(curt).toEqual({});
    expect(received).toEqual(receivedOperation);
  });

  test("Test Replacing update records", () => {
    const curtOp: Operation = {
      updateRecords: [
        updateRecord(
          ["1", "2", "3"],
          [
            ["name", "age"],
            ["John", "12"],
            ["Alice", "11"],
            ["Lily", "13"],
          ]
        ),
        updateRecord(
          ["1", "2", "3"],
          [["phone"], ["111111111111"], ["22222222222"], ["33333333333"]]
        ),
      ],
      deleteColumns: ["email"],
      deleteRecords: [{ uuid: "4" }],
    };

    const recvOp: Operation = {
      updateRecords: [
        updateRecord(["1"], [["name"], ["Joni"]]),
        updateRecord(
          ["2"],
          [
            ["age", "name"],
            ["21", "Nick"],
          ]
        ),
        updateRecord(
          ["2", "4"],
          [
            ["name", "email"],
            ["Bob", "1123@qq.com"],
            ["Ruby", "2232@gmail.com"],
          ]
        ),
      ],
      deleteColumns: ["phone"],
      deleteRecords: [{ uuid: "3" }, { uuid: "5" }],
    };

    const pair = transform(curtOp, recvOp);

    const expectedCurtOp: Operation = {
      deleteColumns: ["email"],
      updateRecords: [
        {
          ids: [{ uuid: "1" }],
          columns: ["age"],
          values: [["12"]],
        },
      ],
      deleteRecords: [{ uuid: "4" }],
    };
    expect(pair[0]).toEqual(expectedCurtOp);

    const expectedRecvOp: Operation = {
      updateRecords: [
        {
          ids: [{ uuid: "1" }],
          columns: ["name"],
          values: [["Joni"]],
        },
        {
          ids: [{ uuid: "2" }],
          columns: ["age", "name"],
          values: [["21", "Bob"]],
        },
      ],
      deleteRecords: [{ uuid: "3" }, { uuid: "5" }],
      deleteColumns: ["phone"],
    };
    expect(pair[1]).toEqual(expectedRecvOp);
  });

  test("Test transform outstanding and buffer when received operation from the server side", () => {
    const outstanding: Operation = {
      insertColumns: {
        name: {
          name: "name",
          displayName: "Name",
          width: 100,
          orderBy: 10000,
        },
      },
      updateRecords: [
        {
          ids: [{ uuid: "123" }, { uuid: "321" }],
          columns: ["email"],
          values: [["outstanding@qq.com"], ["outstanding2@qq.com"]],
        },
      ],
      deleteColumns: ["nick"],
    };

    const buffer: Operation = {
      updateRecords: [
        {
          ids: [{ uuid: "123" }, { uuid: "321" }],
          columns: ["name"],
          values: [["John"], ["Den"]],
        },
        { ids: [{ uuid: "456" }], columns: ["age"], values: [["18"]] },
      ],
      deleteColumns: ["address"],
    };

    const receivedOperation: Operation = {
      deleteColumns: ["age", "address"],
      insertColumns: {
        name: {
          name: "name",
          displayName: "Name1",
          width: 101,
          orderBy: 10001,
        },
      },
      updateColumns: {
        nick: {
          name: "nick",
          displayName: "Nick1",
          width: 100,
          orderBy: 10000,
        },
      },
      updateRecords: [
        {
          ids: [{ uuid: "123" }, { uuid: "321" }],
          columns: ["email"],
          values: [["1@qq.com"], ["2@qq.com"]],
        },
      ],
    };

    const transformedReceivedOp: Operation = {
      deleteColumns: ["age", "address"],
      updateColumns: {
        name: {
          name: "name",
          displayName: "Name1",
          width: 101,
          orderBy: 10001,
        },
      },
      updateRecords: [
        {
          ids: [{ uuid: "123" }, { uuid: "321" }],
          columns: ["email"],
          values: [["1@qq.com"], ["2@qq.com"]],
        },
      ],
    };

    const transformedOutstanding: Operation = {
      deleteColumns: ["nick"],
    };

    const pair1 = transform(outstanding, receivedOperation);
    expect(pair1[0]).toEqual(transformedOutstanding);
    expect(pair1[1]).toEqual(transformedReceivedOp);

    const newBuffer: Operation = {
      updateRecords: [
        {
          ids: [{ uuid: "123" }, { uuid: "321" }],
          columns: ["name"],
          values: [["John"], ["Den"]],
        },
      ],
      deleteColumns: ["address"],
    };
    const pair2 = transform(buffer, pair1[1]);
    expect(pair2[1]).toEqual(transformedReceivedOp);
    expect(pair2[0]).toEqual(newBuffer);
  });

  test("should remove deleted columns from insertRecords", () => {
    const before: Operation = {
      deleteColumns: ["name", "age"],
    };

    const curt: Operation = {
      insertRecords: [
        {
          ids: [{ symbol: "1" }],
          columns: ["name", "age", "address"],
          values: [["John", "12", "Beijing"]],
        },
      ],
    };

    const pair = transform(curt, before);
    const newCurt: Operation = {
      insertRecords: [
        {
          ids: [{ symbol: "1" }],
          columns: ["address"],
          values: [["Beijing"]],
        },
      ],
    };
    expect(pair[0]).toEqual(newCurt);
  });
});

const updateRecord = (ids: string[], data: string[][]): RecordChanges => ({
  ids: ids.map((id) => ({ uuid: id })),
  values: data.slice(1),
  columns: data[0],
});
