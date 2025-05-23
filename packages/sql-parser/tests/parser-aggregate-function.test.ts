import { describe, expect, test } from "vitest";
import { DataType, SelectStatement } from "../src/ast";
import { Parser } from "../src/parser";
import { astToString } from "../src";

describe("Aggregate function", () => {
  test("should parse SUM function", () => {
    const sql = ["SELECT SUM(column_name)", "FROM", "table_name;"].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Sum",
            distinct: false,
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

    if (result.type === "success") {
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse TOTAL function", () => {
    const sql = ["SELECT TOTAL(column_name)", "FROM", "table_name;"].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Total",
            distinct: false,
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
    if (result.type === "success") {
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse AVG function", () => {
    const sql = ["SELECT AVG(column_name)", "FROM", "table_name;"].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Avg",
            distinct: false,
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
    if (result.type === "success") {
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse COUNT function", () => {
    const sql = ["SELECT COUNT(column_name)", "FROM", "table_name;"].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Count",
            distinct: false,
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
    if (result.type === "success") {
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse MAX function", () => {
    const sql = ["SELECT MAX(column_name)", "FROM", "table_name;"].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Max",
            distinct: false,
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
    if (result.type === "success") {
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse MIN function", () => {
    const sql = ["SELECT MIN(column_name)", "FROM", "table_name;"].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "Min",
            distinct: false,
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
    if (result.type === "success") {
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse GROUP_CONCAT function with consts separator", () => {
    const sql = [
      "SELECT GROUP_CONCAT(column_name, ','), GROUP_CONCAT(column_name, 1), GROUP_CONCAT(columns_name, 1.2)",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            separator: {
              type: "String",
              value: ",",
            },
          },
        },
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            separator: {
              type: "Integer",
              value: 1,
            },
          },
        },
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "columns_name",
            },
            separator: {
              type: "Float",
              value: 1.2,
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
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse GROUP_CONCAT function with reference separator", () => {
    const sql = [
      "SELECT GROUP_CONCAT(column_name, column_name2)",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            separator: {
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
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse GROUP_CONCAT function with expression separator", () => {
    const sql = [
      "SELECT GROUP_CONCAT(column_name, column_name2 + 1)",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            separator: {
              type: "Binary",
              operator: { type: "Plus", value: "+" },
              left: {
                type: "Reference",
                name: "column_name2",
              },
              right: {
                type: "Integer",
                value: 1,
              },
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
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse GROUP_CONCAT function with CAST AS separator", () => {
    const sql = [
      "SELECT GROUP_CONCAT(column_name, CAST(column_name2 AS INTEGER))",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            separator: {
              type: "Cast",
              expr: {
                type: "Reference",
                name: "column_name2",
              },
              as: DataType.Integer,
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
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse GROUP_CONCAT function with order by", () => {
    const sql = [
      "SELECT GROUP_CONCAT(column_name, column_name2 ORDER BY column_name3)",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            separator: {
              type: "Reference",
              name: "column_name2",
            },
            orderBy: [
              {
                expr: { type: "Reference", name: "column_name3" },
              },
            ],
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
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse GROUP_CONCAT function with order by and separator", () => {
    const sql = [
      "SELECT GROUP_CONCAT(column_name, column_name2 ORDER BY column_name3 ASC)",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            separator: {
              type: "Reference",
              name: "column_name2",
            },
            orderBy: [
              {
                expr: { type: "Reference", name: "column_name3" },
                order: "asc",
              },
            ],
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
      expect(astToString(result.sql)).toBe(sql);
    }
  });

  test("should parse GROUP_CONCAT function with order by case when then", () => {
    const sql = [
      "SELECT GROUP_CONCAT(column_name, column_name2 ORDER BY CASE WHEN column_name3 = 1 THEN column_name4 END)",
      "FROM",
      "table_name;",
    ].join("\n");
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: [
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "column_name",
            },
            separator: {
              type: "Reference",
              name: "column_name2",
            },
            orderBy: [
              {
                expr: {
                  type: "Case",
                  cases: [
                    {
                      when: {
                        type: "Binary",
                        operator: { type: "Equals", value: "=" },
                        left: {
                          type: "Reference",
                          name: "column_name3",
                        },
                        right: {
                          type: "Integer",
                          value: 1,
                        },
                      },
                      then: {
                        type: "Reference",
                        name: "column_name4",
                      },
                    },
                  ],
                },
              },
            ],
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
      expect(astToString(result.sql).replaceAll("\n", " ")).toBe(
        sql.replaceAll("\n", " ")
      );
    }
  });
});
