import { describe, expect, test } from "@jest/globals";
import { SelectStatement, sql2String } from "./ast";
import { Parser } from "./parser";

describe("Limit Clause", () => {
  test("should parse limit clause", () => {
    const sql = "SELECT * FROM users LIMIT 10;";
    const expected: SelectStatement = {
      type: "select",
      columns: "*",
      table: {
        type: "table-name",
        name: "users",
      },
      limit: {
        expr: {
          type: "Integer",
          value: 10,
        },
      },
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
    expect(sql2String(expected)).toBe(sql);
  });

  test("should parse limit with offset", () => {
    const sql = "SELECT * FROM users LIMIT 10 OFFSET 5;";
    const expected: SelectStatement = {
      type: "select",
      columns: "*",
      table: {
        type: "table-name",
        name: "users",
      },
      limit: {
        expr: {
          type: "Integer",
          value: 10,
        },
        offset: {
          type: "Integer",
          value: 5,
        },
      },
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
    expect(sql2String(expected)).toBe(sql);
  });
});
