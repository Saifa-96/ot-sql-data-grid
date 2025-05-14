import { describe, expect, test } from "@jest/globals";
import { Parser } from "./parser";
import { SelectStatement } from "./ast";

describe("Parser order by clause", () => {
  test("should parse ORDER BY clause with ASC", () => {
    const sql = "SELECT * FROM table_name ORDER BY column_name ASC;";
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: "*",
      orderBy: [
        {
          expr: { type: "Reference", name: "column_name" },
          order: "asc",
        },
      ],
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
  });

  test("should parse ORDER BY clause with DESC", () => {
    const sql = "SELECT * FROM table_name ORDER BY column_name DESC;";
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: "*",
      orderBy: [
        {
          expr: { type: "Reference", name: "column_name" },
          order: "desc",
        },
      ],
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
  });

  test("should parse ORDER BY clause with multiple columns", () => {
    const sql = "SELECT * FROM table_name ORDER BY column1 ASC, column2 DESC;";
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: "*",
      orderBy: [
        {
          expr: { type: "Reference", name: "column1" },
          order: "asc",
        },
        {
          expr: { type: "Reference", name: "column2" },
          order: "desc",
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
