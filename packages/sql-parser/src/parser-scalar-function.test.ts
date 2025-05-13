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

  test("should parse UPPER function", () => {
    const sql = "SELECT UPPER(column_name) FROM table_name;";
    const expected: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "table_name" },
      columns: [
        {
          expr: {
            type: "Upper",
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

  test("should parse LOWER function", () => {
    const sql = "SELECT LOWER(column_name) FROM table_name;";
    const expected: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "table_name" },
      columns: [
        {
          expr: {
            type: "Lower",
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

  test("should parse TRIM function", () => {
    const sql = "SELECT TRIM(column_name) FROM table_name;";
    const expected: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "table_name" },
      columns: [
        {
          expr: {
            type: "Trim",
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

  test("should parse TRIM function with characters", () => {
    const sql = "SELECT TRIM(column_name, 'abc') FROM table_name;";
    const expected: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "table_name" },
      columns: [
        {
          expr: {
            type: "Trim",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            chars: {
              type: "String",
              value: "abc",
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

  test("should parse LTRIM function", () => {
    const sql = "SELECT LTRIM(column_name) FROM table_name;";
    const expected: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "table_name" },
      columns: [
        {
          expr: {
            type: "LTrim",
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

  test("should parse RTRIM function", () => {
    const sql = "SELECT RTRIM(column_name) FROM table_name;";
    const expected: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "table_name" },
      columns: [
        {
          expr: {
            type: "RTrim",
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
