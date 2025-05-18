import { describe, expect, test } from "vitest";
import {
  RecordChanges,
  RecordChangesCollection,
} from "./record-changes-collection";
import { Identity } from "./identity";

describe("Test record-changes-box", () => {
  test("Test the prune method", () => {
    const changes: RecordChanges = {
      ids: [{ uuid: "1" }, { uuid: "2" }, { uuid: "3" }],
      columns: ["name", "age", "phone"],
      values: [
        ["Bob", "12", "111111111111"],
        ["Alice", "11", "22222222222"],
        ["Lily", "13", "33333333333"],
      ],
    };

    const deleteColumns: string[] = ["name", "phone"];
    const deleteRecords: Identity[] = [
      { uuid: "1" },
      { uuid: "3" },
      { uuid: "4" },
      { uuid: "10" },
    ];
    const result = new RecordChangesCollection([changes]).execPrune(
      deleteRecords,
      deleteColumns
    );
    result.execPrune([{ uuid: "9" }], []);

    const expected: RecordChanges = {
      ids: [{ uuid: "2" }],
      columns: ["age"],
      values: [["11"]],
    };
    expect(result.toRecordChangesArray()).toEqual([expected]);

    expect(result.getRemainDeleteRecords()).toEqual([
      { uuid: "4" },
      { uuid: "10" },
      { uuid: "9" },
    ]);
  });

  test("Test the transform method", () => {
    const curtCollection = new RecordChangesCollection([
      {
        ids: [{ uuid: "1" }, { uuid: "2" }, { uuid: "3" }],
        columns: ["name", "age", "email"],
        values: [
          ["Bob", "12", "1@qq.com"],
          ["Alice", "11", "2@qq.com"],
          ["Lily", "13", "3@qq.com"],
        ],
      },
      {
        ids: [{ uuid: "1" }],
        columns: ["address"],
        values: [["Shanghai"]],
      },
    ]);

    const recvCollection = new RecordChangesCollection([
      {
        ids: [{ uuid: "1" }],
        columns: ["address", "age"],
        values: [["Beijing", "21"]],
      },
      {
        ids: [{ uuid: "2" }],
        columns: ["name", "age"],
        values: [["Join", "31"]],
      },
      {
        ids: [{ uuid: "3" }],
        columns: ["age"],
        values: [["40"]],
      },
    ]);

    RecordChangesCollection.transform(curtCollection, recvCollection);

    const expectedCurtBoxes: RecordChanges[] = [
      {
        ids: [{ uuid: "1" }, { uuid: "3" }],
        columns: ["email", "name"],
        values: [
          ["1@qq.com", "Bob"],
          ["3@qq.com", "Lily"],
        ],
      },
      {
        ids: [{ uuid: "2" }],
        columns: ["email"],
        values: [["2@qq.com"]],
      },
    ];

    const result = curtCollection.toRecordChangesArray();
    expect(result).toEqual(expectedCurtBoxes);
  });
});
