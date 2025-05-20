import { describe, expect, test } from "vitest";
import { SelectStatement } from "../src/ast";
import { Parser } from "../src/parser";
import { sql2String } from "../src/ast-to-string";

describe("Join Clause", () => {
  test("should parse join", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "users",
      "JOIN orders ON users.id = orders.user_id;",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          type: "inner",
          table: {
            type: "table-name",
            name: "orders",
          },
          condition: {
            type: "on",
            expr: {
              type: "Binary",
              operator: { type: "Equals", value: "=" },
              left: {
                type: "Reference",
                table: "users",
                name: "id",
              },
              right: {
                type: "Reference",
                table: "orders",
                name: "user_id",
              },
            },
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(
        [
          "SELECT *",
          "FROM",
          "users",
          "INNER JOIN orders ON users.id = orders.user_id;",
        ].join("\n")
      );
    }
  });

  test("should parse inner join", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "users",
      "INNER JOIN orders ON users.id = orders.user_id;",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          type: "inner",
          table: {
            type: "table-name",
            name: "orders",
          },
          condition: {
            type: "on",
            expr: {
              type: "Binary",
              operator: { type: "Equals", value: "=" },
              left: {
                type: "Reference",
                table: "users",
                name: "id",
              },
              right: {
                type: "Reference",
                table: "orders",
                name: "user_id",
              },
            },
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse left join", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "users",
      "LEFT JOIN orders ON users.id = orders.user_id;",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          outer: false,
          type: "left",
          table: {
            type: "table-name",
            name: "orders",
          },
          condition: {
            type: "on",
            expr: {
              type: "Binary",
              operator: { type: "Equals", value: "=" },
              left: {
                type: "Reference",
                table: "users",
                name: "id",
              },
              right: {
                type: "Reference",
                table: "orders",
                name: "user_id",
              },
            },
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse right join", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "users",
      "RIGHT JOIN orders ON users.id = orders.user_id;",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          outer: false,
          type: "right",
          table: {
            type: "table-name",
            name: "orders",
          },
          condition: {
            type: "on",
            expr: {
              type: "Binary",
              operator: { type: "Equals", value: "=" },
              left: {
                type: "Reference",
                table: "users",
                name: "id",
              },
              right: {
                type: "Reference",
                table: "orders",
                name: "user_id",
              },
            },
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse full join", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "users",
      "FULL JOIN orders ON users.id = orders.user_id;",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          outer: false,
          type: "full",
          table: {
            type: "table-name",
            name: "orders",
          },
          condition: {
            type: "on",
            expr: {
              type: "Binary",
              operator: { type: "Equals", value: "=" },
              left: {
                type: "Reference",
                table: "users",
                name: "id",
              },
              right: {
                type: "Reference",
                table: "orders",
                name: "user_id",
              },
            },
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse cross join", () => {
    const sql = ["SELECT *", "FROM", "users", "CROSS JOIN orders;"].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          type: "cross",
          table: {
            type: "table-name",
            name: "orders",
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse natural join", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "users",
      "NATURAL RIGHT JOIN orders;",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          outer: false,
          type: "right",
          condition: { type: "natural" },
          table: {
            type: "table-name",
            name: "orders",
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse outer natural join", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "users",
      "NATURAL FULL OUTER JOIN orders;",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          outer: true,
          type: "full",
          condition: { type: "natural" },
          table: {
            type: "table-name",
            name: "orders",
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse using join", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "users",
      "INNER JOIN orders USING (id);",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          type: "inner",
          table: {
            type: "table-name",
            name: "orders",
          },
          condition: {
            type: "using",
            columns: ["id"],
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });

  test("should parse sub-query join", () => {
    const sql = [
      "SELECT *",
      "FROM",
      "users",
      "INNER JOIN (SELECT *",
      "FROM",
      "orders) AS o ON users.id = o.user_id;",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    const expectedAST: SelectStatement = {
      type: "select",
      columns: "*",
      from: [
        {
          type: "table-name",
          name: "users",
        },
      ],
      join: [
        {
          type: "inner",
          table: {
            type: "subquery",
            stmt: {
              type: "select",
              columns: "*",
              from: [
                {
                  type: "table-name",
                  name: "orders",
                },
              ],
            },
            alias: "o",
          },
          condition: {
            type: "on",
            expr: {
              type: "Binary",
              operator: { type: "Equals", value: "=" },
              left: {
                type: "Reference",
                table: "users",
                name: "id",
              },
              right: {
                type: "Reference",
                table: "o",
                name: "user_id",
              },
            },
          },
        },
      ],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedAST,
    });
    if (result.type === "success") {
      expect(sql2String(result.sql)).toEqual(sql);
    }
  });
});
