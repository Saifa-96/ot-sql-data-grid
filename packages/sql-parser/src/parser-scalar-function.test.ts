import { describe, expect, test } from "@jest/globals";
import { DataType, SelectStatement } from "./ast";
import { Parser } from "./parser";

describe("Parser Scalar Function", () => {
  test("should parse CAST function", () => {
    const sql = "SELECT CAST(column_name AS INT) FROM table_name;";
    const expected: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "table_name" },
      columns: [
        {
          expr: {
            type: "Cast",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            as: DataType.Integer,
          },
        },
      ],
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
  });

  test("should parse LENGTH function", () => {
    const sql = "SELECT LENGTH(column_name) FROM table_name;";
    const expected: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "table_name" },
      columns: [
        {
          expr: {
            type: "Length",
            expr: {
              type: "Reference",
              name: "column_name",
            },
          },
        },
      ],
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
  });
});
