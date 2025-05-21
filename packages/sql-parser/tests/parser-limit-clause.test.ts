import { describe, expect, test } from "vitest";
import { SelectStatement } from "../src/ast";
import { Parser } from "../src/parser";
import { astToString } from "../src/ast-to-string";

describe("Limit Clause", () => {
  test("should parse limit clause", () => {
    const sql = "SELECT * FROM users LIMIT 10;";
    const expected: SelectStatement = {
      type: "select",
      columns: "*",
      from: [{ type: "table-name", name: "users" }],
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
    expect(astToString(expected).replaceAll('\n', ' ')).toBe(sql);
  });

  test("should parse limit with offset", () => {
    const sql = "SELECT * FROM users LIMIT 10 OFFSET 5;";
    const expected: SelectStatement = {
      type: "select",
      columns: "*",
      from: [{ type: "table-name", name: "users" }],
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
    expect(astToString(expected).replaceAll('\n', ' ')).toEqual(sql.replaceAll('\n', ' '));
  });
});
