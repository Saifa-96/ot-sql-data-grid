// 帮我写一个ast.ts的测试文件

import * as methods from "../src/ast-to-string";
import * as AST from "../src/ast";
import { describe, expect, test } from "vitest";
import { Parser } from "../src/parser";

describe("ast", () => {
  test("sql2String", () => {
    const sql: AST.SQL = {
      type: "transaction",
      stmts: [
        {
          type: "create-table",
          name: "users",
          columns: [
            { name: "id", datatype: AST.DataType.Integer, primary: true },
            { name: "name", datatype: AST.DataType.String, primary: false },
          ],
        },
        {
          type: "insert",
          tableName: "users",
          columns: ["id", "name"],
          values: [
            [
              { type: "Integer", value: 1 },
              { type: "String", value: "Alice" },
            ],
            [
              { type: "Integer", value: 2 },
              { type: "String", value: "Bob" },
            ],
          ],
        },
      ],
    };
    const result = methods.sql2String(sql);
    expect(result).toBe(
      [
        "BEGIN TRANSACTION;",
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name STRING);",
        "INSERT INTO users (id, name) VALUES (1, 'Alice'), (2, 'Bob');",
        "COMMIT;",
      ].join("\n")
    );
  });

  test("sql2String", () => {
    const sql = `
    BEGIN TRANSACTION;
    ALTER TABLE main_data ADD COLUMN name_gender TEXT;
    UPDATE main_data SET name_gender = name || '(' || gender || ')';
    ALTER TABLE main_data DROP COLUMN name;
    ALTER TABLE main_data DROP COLUMN gender;
    DELETE FROM columns WHERE id IN ('name', 'gender');
    INSERT INTO columns (id, field_name, display_name, width, order_by) VALUES ('name_gender', 'name_gender', 'Name(Gender)', 300, 20000);
    COMMIT;
    `;

    const result = new Parser(sql).safeParse();
    expect(result.type).toBe("success");
    if (result.type === "success") {
      const sqlStr = methods.sql2String(result.sql);
      expect(sqlStr).toBe(
        [
          "BEGIN TRANSACTION;",
          "ALTER TABLE main_data ADD COLUMN name_gender STRING;",
          "UPDATE main_data SET name_gender = name || '(' || gender || ')'",
          "ALTER TABLE main_data DROP COLUMN name;",
          "ALTER TABLE main_data DROP COLUMN gender;",
          "DELETE FROM columns WHERE id IN ('name', 'gender');",
          "INSERT INTO columns (id, field_name, display_name, width, order_by) VALUES ('name_gender', 'name_gender', 'Name(Gender)', 300, 20000);",
          "COMMIT;",
        ].join("\n")
      );
    }
  });

  test("should parse subquery", () => {
    const sql = [
      "SELECT emp_name, incentive",
      "FROM",
      "(SELECT 1 AS id, 'Alice' AS emp_name, 5000 AS salary, 500 AS incentive",
      "UNION ALL",
      "SELECT 2, 'Bob', 6000, 900",
      "UNION ALL",
      "SELECT 3, 'Charlie', 7000, 1400) AS my_data",
      "WHERE incentive > 500",
      "ORDER BY emp_name ASC, incentive DESC;",
    ].join("\n");
    const result = new Parser(sql).safeParse();
    expect(result.type).toBe("success");
    if (result.type === "success") {
      const sqlStr = methods.sql2String(result.sql);
      expect(sqlStr).toBe(sql);
    }
  });

  test("GROUP_CONCAT", () => {
    const expected: AST.SelectStatement = {
      type: "select",
      columns: [
        {
          expr: {
            type: "GroupConcat",
            expr: {
              type: "Reference",
              name: "emp_name",
            },
            separator: {
              type: "String",
              value: ", ",
            },
          },
          alias: "emp_names",
        },
      ],
      from: [{ type: "table-name", name: "table_name" }],
    };
    expect(methods.sql2String(expected)).toBe(
      `SELECT GROUP_CONCAT(emp_name, ', ') AS emp_names\nFROM\ntable_name;`
    );
  });

  test("TRIM with CHARS", () => {
    const expected: AST.SelectStatement = {
      type: "select",
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
      from: [{ type: "table-name", name: "table_name" }],
    };
    expect(methods.sql2String(expected)).toBe(
      `SELECT TRIM(column_name, 'abc')\nFROM\ntable_name;`
    );
  });
});
