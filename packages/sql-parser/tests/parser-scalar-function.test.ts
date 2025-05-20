import { describe, expect, test } from "vitest";
import { DataType, SelectStatement } from "../src/ast";
import { Parser } from "../src/parser";
import { sql2String } from "../src";

describe("Parser Scalar Function", () => {
  test("should parse CAST function", () => {
    const sql = "SELECT CAST(column_name AS INT) FROM table_name;";
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
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
      from: [{ type: "table-name", name: "table_name" }],
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
      from: [{ type: "table-name", name: "table_name" }],
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
      from: [{ type: "table-name", name: "table_name" }],
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
      from: [{ type: "table-name", name: "table_name" }],
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
      from: [{ type: "table-name", name: "table_name" }],
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
      from: [{ type: "table-name", name: "table_name" }],
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
      from: [{ type: "table-name", name: "table_name" }],
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

  test("should parse DATE function", () => {
    const sql = ["SELECT DATE(column_name)", "FROM", "table_name;"].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Date",
            timeValue: {
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

    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse DATE function with modifiers", () => {
    const sql = [
      "SELECT DATE(column_name, 'modifier1', 'modifier2')",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Date",
            timeValue: {
              type: "Reference",
              name: "column_name",
            },
            modifiers: ["modifier1", "modifier2"],
          },
        },
      ],
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

  test("should parse TIME function", () => {
    const sql = ["SELECT TIME(column_name)", "FROM", "table_name;"].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Time",
            timeValue: {
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
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });
  test("should parse TIME function with modifiers", () => {
    const sql = [
      "SELECT TIME(column_name, 'modifier1', 'modifier2')",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Time",
            timeValue: {
              type: "Reference",
              name: "column_name",
            },
            modifiers: ["modifier1", "modifier2"],
          },
        },
      ],
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

  test("should parse DATETIME function", () => {
    const sql = ["SELECT DATETIME(column_name)", "FROM", "table_name;"].join(
      "\n"
    );
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Datetime",
            timeValue: {
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
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse JULIANDAY function", () => {
    const sql = ["SELECT JULIANDAY(column_name)", "FROM", "table_name;"].join(
      "\n"
    );
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "JulianDay",
            timeValue: {
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
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse UNIXEPOCH function", () => {
    const sql = ["SELECT UNIXEPOCH(column_name)", "FROM", "table_name;"].join(
      "\n"
    );
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "UnixEpoch",
            timeValue: {
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
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse STRFTIME function", () => {
    const sql = [
      "SELECT STRFTIME('%Y-%m-%d', column_name, 'modifier')",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Strftime",
            format: "%Y-%m-%d",
            timeValue: {
              type: "Reference",
              name: "column_name",
            },
            modifiers: ["modifier"],
          },
        },
      ],
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

  test("should parse timediff function", () => {
    const sql = [
      "SELECT TIMEDIFF(column_name1, column_name2)",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "TimeDiff",
            timeValue1: {
              type: "Reference",
              name: "column_name1",
            },
            timeValue2: {
              type: "Reference",
              name: "column_name2",
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
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse substr function", () => {
    const sql = [
      "SELECT SUBSTR(column_name, 1, 2)",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Substr",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            start: {
              type: "Integer",
              value: 1,
            },
            length: {
              type: "Integer",
              value: 2,
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
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });
});
