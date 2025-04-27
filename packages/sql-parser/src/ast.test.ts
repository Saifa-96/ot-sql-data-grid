// 帮我写一个ast.ts的测试文件

import * as methods from "./ast";
import { describe, expect, test } from "@jest/globals";
import { Parser } from "./parser";

describe("ast", () => {
  test("sql2String", () => {
    const sql: methods.SQL = {
      type: "transaction",
      stmts: [
        {
          type: "create-table",
          name: "users",
          columns: [
            { name: "id", datatype: methods.DataType.Integer, primary: true },
            { name: "name", datatype: methods.DataType.String, primary: false },
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
          "UPDATE main_data SET name_gender = (name || ('(' || (gender || ')')));",
          "ALTER TABLE main_data DROP COLUMN name;",
          "ALTER TABLE main_data DROP COLUMN gender;",
          "DELETE FROM columns WHERE id IN ('name', 'gender');",
          "INSERT INTO columns (id, field_name, display_name, width, order_by) VALUES ('name_gender', 'name_gender', 'Name(Gender)', 300, 20000);",
          "COMMIT;",
        ].join("\n")
      );
    }
  });

  test("sql2String", () => {
    const sql = `
      SELECT emp_name, incentive 
      FROM (
        VALUES 
          (1, 'Alice', 5000, 5000 * 0.1),
          (2, 'Bob', 6000, 6000 * 0.15),
          (3, 'Charlie', 7000, 7000 * 0.2)
       ) AS my_data(emp_id, emp_name, base_salary, incentive)
      WHERE incentive > 500;
    `;
    const result = new Parser(sql).safeParse();
    expect(result.type).toBe("success");
    if (result.type === "success") {
      const sqlStr = methods.sql2String(result.sql);
      expect(sqlStr).toBe(
        `SELECT emp_name, incentive FROM (VALUES (1,'Alice',5000,(5000 * 0.1)),(2,'Bob',6000,(6000 * 0.15)),(3,'Charlie',7000,(7000 * 0.2))) AS my_data(emp_id,emp_name,base_salary,incentive) WHERE incentive > 500;`
      );
    }

    const sql2 = `
    SELECT 'a' AS col1, 1 AS col2
    UNION ALL
    SELECT 'b', 2
    UNION ALL
    SELECT 'c', 3;
    `;
    const result1 = new Parser(sql2).safeParse();
    const sqlObj: methods.SelectStatement = {
      type: "select",
      columns: [
        { expr: { type: "String", value: "a" }, alias: "col1" },
        { expr: { type: "Integer", value: 1 }, alias: "col2" },
      ],
      unionAll: [
        [
          { type: "String", value: "b" },
          { type: "Integer", value: 2 },
        ],
        [
          { type: "String", value: "c" },
          { type: "Integer", value: 3 },
        ],
      ],
    };
    expect(result1).toEqual({
      type: "success",
      sql: sqlObj,
    });
  });
});
