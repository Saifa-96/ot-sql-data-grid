import { describe, expect, test } from "vitest";
import { Parser, SelectStatement, sql2String } from "../src";

describe("Parser Expression", () => {
  test("should parse like expression", () => {
    const sql = ["SELECT *", "FROM", "t", "WHERE a LIKE 'abc%';"].join("\n");
    const expected: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "t",
        },
      ],
      where: {
        not: false,
        expr: {
          not: false,
          type: "Like",
          target: {
            type: "Reference",
            name: "a",
          },
          pattern: {
            type: "String",
            value: "abc%",
          },
        },
      },
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse like expression with escape", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "t",
      "WHERE a LIKE 'abc%' ESCAPE '\\';",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "t",
        },
      ],
      where: {
        not: false,
        expr: {
          not: false,
          type: "Like",
          target: {
            type: "Reference",
            name: "a",
          },
          pattern: {
            type: "String",
            value: "abc%",
          },
          escape: {
            type: "String",
            value: "\\",
          },
        },
      },
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });
});
