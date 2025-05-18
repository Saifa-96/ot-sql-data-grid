import { describe, test, expect } from "vitest";
import { compose } from "./compose";
import { Operation } from "./operation";

describe("Test compose", () => {
  test("Test compose", () => {
    const curtOp: Operation = {
      insertRecords: [
        {
          ids: [{ symbol: "s1" }, { symbol: "s2" }],
          columns: ["name", "age"],
          values: [
            ["John", "12"],
            ["Alice", "11"],
          ],
        },
      ],
      insertColumns: {
        address: {
          name: "address",
          displayName: "Address",
          width: 100,
          orderBy: 10000,
        },
      },
      updateRecords: [
        {
          ids: [{ uuid: "u3" }],
          columns: ["name", "age"],
          values: [["Lily", "13"]],
        },
      ],
    };

    const recvOp: Operation = {
      insertColumns: {
        email: {
          name: "email",
          displayName: "Email",
          width: 100,
          orderBy: 10000,
        },
      },
      insertRecords: [
        {
          ids: [{ symbol: "s3" }],
          columns: ["name"],
          values: [["Bob"]],
        },
      ],
      deleteColumns: ["age", "address"],
      deleteRecords: [{ symbol: "s2" }, { symbol: "s7" }, { uuid: "u3" }],
    };

    const result = compose(curtOp, recvOp);
    const expected: Operation = {
      insertColumns: {
        email: {
          name: "email",
          displayName: "Email",
          width: 100,
          orderBy: 10000,
        },
      },
      insertRecords: [
        {
          ids: [{ symbol: "s1" }, { symbol: "s3" }],
          columns: ["name"],
          values: [["John"], ["Bob"]],
        },
      ],
      deleteColumns: ["age"],
      deleteRecords: [{ symbol: "s7" }, { uuid: "u3" }],
    };
    expect(result).toEqual(expected);
  });
});
