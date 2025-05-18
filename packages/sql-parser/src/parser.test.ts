import { describe, expect, test } from "vitest";
import {
  DataType,
  DeleteStatement,
  InsertStatement,
  SelectStatement,
  Transaction,
  UpdateStatement,
} from "./ast";
import { Parser } from "./index";

describe("Test Parser", () => {
  test("should parse comments", () => {
    const parser = new Parser(`
          create table tbl (
              -- this is a comment
              id1 int primary key,
              /* this is a multiline comment */
              id2 integer
              /*
              1
              2
              3
              */
              );`);
    const result = parser.safeParse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "create-table",
        name: "tbl",
        columns: [
          {
            datatype: DataType.Integer,
            default: undefined,
            name: "id1",
            nullable: undefined,
            primary: true,
          },
          {
            datatype: DataType.Integer,
            default: undefined,
            name: "id2",
            nullable: undefined,
            primary: false,
          },
        ],
      },
    });
  });

  //   test("should parse fully qualified table name", () => {
  //     const parser = new Parser(`
  // SELECT s.student_name,
  //        COUNT(e.enrollment_id) AS courses_taken,
  //        AVG(CASE
  //            WHEN e.grade = 'A' THEN 4.0
  //            WHEN e.grade = 'A-' THEN 3.7
  //            WHEN e.grade = 'B+' THEN 3.3
  //            WHEN e.grade = 'B' THEN 3.0
  //            ELSE NULL
  //        END) AS gpa
  // FROM students s
  // LEFT JOIN enrollments e ON s.student_id = e.student_id
  // GROUP BY s.student_id, s.student_name
  // ORDER BY gpa DESC;
  // `);
  //   });

  test("test complicated create table sql text", () => {
    const parser = new Parser(`
          create table tbl (
              id1 int primary key,
              id2 integer not null,
              id3 float default 1.0
              );`);
    const result = parser.safeParse();

    expect(result).toEqual({
      type: "success",
      sql: {
        type: "create-table",
        name: "tbl",
        columns: [
          {
            datatype: DataType.Integer,
            default: undefined,
            name: "id1",
            nullable: undefined,
            primary: true,
          },
          {
            datatype: DataType.Integer,
            default: undefined,
            name: "id2",
            nullable: false,
            primary: false,
          },
          {
            datatype: DataType.Float,
            default: { type: "Float", value: 1.0 },
            name: "id3",
            nullable: undefined,
            primary: false,
          },
        ],
      },
    });
  });

  test("Test simple insert sql text", () => {
    const parser = new Parser(`
          insert into tbl (id1, id2) values (1, 2);`);
    const result = parser.safeParse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "insert",
        tableName: "tbl",
        columns: ["id1", "id2"],
        values: [
          [
            { type: "Integer", value: 1 },
            { type: "Integer", value: 2 },
          ],
        ],
      },
    });
  });

  test("Test complicated insert sql text", () => {
    const parser = new Parser(`
          insert into tbl (id1, id2, id3) values ('{}()', 2, 'test''s sss'), (true, null, '\n test \s');`);
    const result = parser.safeParse();

    expect(result).toEqual({
      type: "success",
      sql: {
        type: "insert",
        tableName: "tbl",
        columns: ["id1", "id2", "id3"],
        values: [
          [
            { type: "String", value: "{}()" },
            { type: "Integer", value: 2 },
            {
              type: "String",
              value: "test''s sss",
            },
          ],
          [
            { type: "Boolean", value: true },
            { type: "Null" },
            { type: "String", value: "\n test s" },
          ],
        ],
      },
    });

    const parser2 = new Parser(`
        INSERT INTO columns (field_name, display_name, width, order_by) SELECT 'name_age', display_name || ' (Age)', width, order_by FROM columns WHERE field_name = 'name';`);
    const result2 = parser2.safeParse();
    const insertResult: InsertStatement = {
      type: "insert",
      tableName: "columns",
      columns: ["field_name", "display_name", "width", "order_by"],
      select: {
        type: "select",
        from: [
          {
            name: "columns",
            type: "table-name",
          },
        ],
        columns: [
          { expr: { type: "String", value: "name_age" }, alias: undefined },
          {
            expr: {
              type: "Binary",
              operator: { type: "StringConcatenation", value: "||" },
              left: { type: "Reference", name: "display_name" },
              right: { type: "String", value: " (Age)" },
            },
            alias: undefined,
          },
          { expr: { type: "Reference", name: "width" }, alias: undefined },
          { expr: { type: "Reference", name: "order_by" }, alias: undefined },
        ],
        where: {
          not: false,
          expr: {
            type: "Binary",
            left: { name: "field_name", type: "Reference" },
            operator: { type: "Equals", value: "=" },
            right: { type: "String", value: "name" },
          },
        },
      },
    };

    expect(result2).toEqual({
      type: "success",
      sql: insertResult,
    });
  });

  test("Test simple select sql text", () => {
    const parser = new Parser(`select * from tbl;`);
    const result = parser.safeParse();
    const expectedSQL1: SelectStatement = {
      type: "select",
      columns: "*",
      from: [{ type: "table-name", name: "tbl" }],
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedSQL1,
    });

    const parser1 = new Parser("SELECT MAX(order_by) + 1 FROM columns;");
    const result1 = parser1.safeParse();
    const expectedSQL: SelectStatement = {
      type: "select",
      from: [
        {
          type: "table-name",
          name: "columns",
        },
      ],
      columns: [
        {
          expr: {
            type: "Binary",
            operator: { type: "Plus", value: "+" },
            left: {
              type: "Max",
              expr: { type: "Reference", name: "order_by" },
            },
            right: { type: "Integer", value: 1 },
          },
        },
      ],
    };
    expect(result1).toEqual({
      type: "success",
      sql: expectedSQL,
    });
  });

  test("Test simple alter table sql text", () => {
    const parser = new Parser(`alter table tbl add column id int;`);
    const result = parser.safeParse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "alter",
        tableName: "tbl",
        column: {
          datatype: "INTEGER",
          default: undefined,
          name: "id",
          nullable: undefined,
          primary: false,
        },
        action: "add",
      },
    });

    const parser2 = new Parser(`alter table tbl drop column id;`);
    const result2 = parser2.safeParse();
    expect(result2).toEqual({
      type: "success",
      sql: {
        type: "alter",
        tableName: "tbl",
        columnName: "id",
        action: "drop",
      },
    });

    const parser3 = new Parser(`
        SELECT emp_name, incentive
        FROM (
          VALUES
            (1, 'Alice', 5000, 5000 * 0.1),
            (2, 'Bob', 6000, 6000 * 0.15),
            (3, 'Charlie', 7000, 7000 * 0.2)
         ) AS my_data(emp_id, emp_name, base_salary, incentive)
        WHERE incentive > 500;
      `);
    const result3 = parser3.safeParse();
    const expectedResult3: SelectStatement = {
      type: "select",
      columns: [
        {
          expr: { type: "Reference", name: "emp_name" },
          alias: undefined,
        },
        {
          expr: { type: "Reference", name: "incentive" },
          alias: undefined,
        },
      ],
      from: [
        {
          type: "values",
          values: [
            [
              { type: "Integer", value: 1 },
              { type: "String", value: "Alice" },
              { type: "Integer", value: 5000 },
              {
                type: "Binary",
                operator: { type: "Asterisk", value: "*" },
                left: { type: "Integer", value: 5000 },
                right: { type: "Float", value: 0.1 },
              },
            ],
            [
              { type: "Integer", value: 2 },
              { type: "String", value: "Bob" },
              { type: "Integer", value: 6000 },
              {
                type: "Binary",
                operator: { type: "Asterisk", value: "*" },
                left: { type: "Integer", value: 6000 },
                right: { type: "Float", value: 0.15 },
              },
            ],
            [
              { type: "Integer", value: 3 },
              { type: "String", value: "Charlie" },
              { type: "Integer", value: 7000 },
              {
                type: "Binary",
                operator: { type: "Asterisk", value: "*" },
                left: { type: "Integer", value: 7000 },
                right: { type: "Float", value: 0.2 },
              },
            ],
          ],
          columns: ["emp_id", "emp_name", "base_salary", "incentive"],
          tempTableName: "my_data",
        },
      ],
      where: {
        not: false,
        expr: {
          type: "Binary",
          operator: { type: "GreaterThan", value: ">" },
          left: { type: "Reference", name: "incentive" },
          right: { type: "Integer", value: 500 },
        },
      },
    };
    expect(result3).toEqual({ type: "success", sql: expectedResult3 });
  });

  test("Test simple delete sql text", () => {
    const parser = new Parser(`delete from tbl where id in (1);`);
    const result = parser.safeParse();
    const deleteStmt: DeleteStatement = {
      type: "delete",
      tableName: "tbl",
      where: {
        not: false,
        expr: {
          type: "In",
          not: false,
          target: { name: "id", type: "Reference" },
          values: [{ type: "Integer", value: 1 }],
        },
      },
    };
    expect(result).toEqual({
      type: "success",
      sql: deleteStmt,
    });
  });

  test("Test simple update sql text", () => {
    const parser = new Parser(
      `update tbl set id = 1, test = '123123' where name = 1;`
    );
    const result = parser.safeParse();
    const updateStmt: UpdateStatement = {
      type: "update",
      tableName: "tbl",
      set: [
        {
          column: "id",
          value: {
            type: "Integer",
            value: 1,
          },
        },
        {
          column: "test",
          value: {
            type: "String",
            value: "123123",
          },
        },
      ],
      where: {
        not: false,
        expr: {
          type: "Binary",
          operator: { type: "Equals", value: "=" },
          left: { name: "name", type: "Reference" },
          right: { type: "Integer", value: 1 },
        },
      },
    };
    expect(result).toEqual({
      type: "success",
      sql: updateStmt,
    });

    const parser2 = new Parser(`update tbl set id = 1 where not name = 1;`);
    const result2 = parser2.safeParse();
    const updateStmt2: UpdateStatement = {
      type: "update",
      tableName: "tbl",
      set: [
        {
          column: "id",
          value: {
            type: "Integer",
            value: 1,
          },
        },
      ],
      where: {
        not: true,
        expr: {
          type: "Binary",
          operator: { type: "Equals", value: "=" },
          left: { name: "name", type: "Reference" },
          right: { type: "Integer", value: 1 },
        },
      },
    };
    expect(result2).toEqual({
      type: "success",
      sql: updateStmt2,
    });
  });

  test("Test Transaction", () => {
    const parser2 = new Parser(`
        BEGIN TRANSACTION;
          ALTER TABLE main_data ADD COLUMN name_gender TEXT;
          UPDATE main_data SET name_gender = name || '(' || gender || ')';
          ALTER TABLE main_data DROP COLUMN name;
          ALTER TABLE main_data DROP COLUMN gender;
          DELETE FROM columns WHERE id IN ('name', 'gender');
          INSERT INTO columns (id, field_name, display_name, width, order_by) VALUES ('name_gender', 'name_gender', 'Name(Gender)', 250, 20000);
          UPDATE columns SET order_by = order_by - 10000 WHERE order_by > 20000;
        COMMIT;
      `);
    const result2 = parser2.safeParse();
    const transactionStmt: Transaction = {
      type: "transaction",
      stmts: [
        {
          type: "alter",
          tableName: "main_data",
          column: {
            name: "name_gender",
            default: undefined,
            nullable: undefined,
            datatype: DataType.String,
            primary: false,
          },
          action: "add",
        },
        {
          type: "update",
          tableName: "main_data",
          set: [
            {
              column: "name_gender",
              value: {
                type: "Binary",
                operator: { type: "StringConcatenation", value: "||" },
                left: { type: "Reference", name: "name" },
                right: {
                  type: "Binary",
                  operator: { type: "StringConcatenation", value: "||" },
                  left: { type: "String", value: "(" },
                  right: {
                    type: "Binary",
                    operator: { type: "StringConcatenation", value: "||" },
                    left: { type: "Reference", name: "gender" },
                    right: { type: "String", value: ")" },
                  },
                },
              },
            },
          ],
          where: undefined,
        },
        {
          type: "alter",
          tableName: "main_data",
          columnName: "name",
          action: "drop",
        },
        {
          type: "alter",
          tableName: "main_data",
          columnName: "gender",
          action: "drop",
        },
        {
          type: "delete",
          tableName: "columns",
          where: {
            not: false,
            expr: {
              type: "In",
              not: false,
              target: {
                name: "id",
                type: "Reference",
              },
              values: [
                { type: "String", value: "name" },
                { type: "String", value: "gender" },
              ],
            },
          },
        },
        {
          type: "insert",
          tableName: "columns",
          columns: ["id", "field_name", "display_name", "width", "order_by"],
          values: [
            [
              {
                type: "String",
                value: "name_gender",
              },
              {
                type: "String",
                value: "name_gender",
              },
              {
                type: "String",
                value: "Name(Gender)",
              },
              {
                type: "Integer",
                value: 250,
              },
              {
                type: "Integer",
                value: 20000,
              },
            ],
          ],
        },
        {
          type: "update",
          tableName: "columns",
          set: [
            {
              column: "order_by",
              value: {
                type: "Binary",
                operator: {
                  type: "Minus",
                  value: "-",
                },
                left: {
                  type: "Reference",
                  name: "order_by",
                },
                right: {
                  type: "Integer",
                  value: 10000,
                },
              },
            },
          ],
          where: {
            not: false,
            expr: {
              type: "Binary",
              operator: { type: "GreaterThan", value: ">" },
              left: { name: "order_by", type: "Reference" },
              right: { type: "Integer", value: 20000 },
            },
          },
        },
      ],
    };
    expect(result2).toEqual({
      type: "success",
      sql: transactionStmt,
    });
  });

  test("Test subquery", () => {
    const parser = new Parser(
      "SELECT * FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);"
    );
    const result = parser.safeParse();
    const selectStmt: SelectStatement = {
      type: "select",
      columns: "*",
      from: [{ type: "table-name", name: "employees" }],
      where: {
        not: false,
        expr: {
          type: "Binary",
          operator: { type: "GreaterThan", value: ">" },
          left: { name: "salary", type: "Reference" },
          right: {
            type: "Subquery",
            priority: true,
            stmt: {
              type: "select",
              columns: [
                {
                  expr: {
                    type: "Avg",
                    expr: { type: "Reference", name: "salary" },
                  },
                },
              ],
              from: [{ type: "table-name", name: "employees" }],
              where: undefined,
            },
          },
        },
      },
    };
    expect(result).toEqual({
      type: "success",
      sql: selectStmt,
    });

    const parse1 = new Parser(
      `INSERT INTO columns
      (field_name, display_name, width, order_by)
      SELECT
      'name_age',
      display_name || ' (' || (SELECT display_name FROM columns WHERE field_name = 'age') || ')',
      width,
      order_by
      FROM columns
      WHERE field_name = 'name';`
    );
    const result1 = parse1.safeParse();
    const expectedResult1: InsertStatement = {
      type: "insert",
      tableName: "columns",
      columns: ["field_name", "display_name", "width", "order_by"],
      select: {
        type: "select",
        columns: [
          { expr: { type: "String", value: "name_age" } },
          {
            expr: {
              type: "Binary",
              operator: { type: "StringConcatenation", value: "||" },
              left: { type: "Reference", name: "display_name" },
              right: {
                type: "Binary",
                operator: { type: "StringConcatenation", value: "||" },
                left: { type: "String", value: " (" },
                right: {
                  type: "Binary",
                  operator: { type: "StringConcatenation", value: "||" },
                  left: {
                    type: "Subquery",
                    priority: true,
                    stmt: {
                      type: "select",
                      columns: [
                        { expr: { type: "Reference", name: "display_name" } },
                      ],
                      from: [{ type: "table-name", name: "columns" }],
                      where: {
                        not: false,
                        expr: {
                          type: "Binary",
                          operator: { type: "Equals", value: "=" },
                          left: { name: "field_name", type: "Reference" },
                          right: { type: "String", value: "age" },
                        },
                      },
                    },
                  },
                  right: { type: "String", value: ")" },
                },
              },
            },
          },
          { expr: { type: "Reference", name: "width" } },
          { expr: { type: "Reference", name: "order_by" } },
        ],
        from: [{ type: "table-name", name: "columns" }],
        where: {
          not: false,
          expr: {
            type: "Binary",
            operator: { type: "Equals", value: "=" },
            left: { name: "field_name", type: "Reference" },
            right: { type: "String", value: "name" },
          },
        },
      },
    };
    expect(result1).toEqual({
      type: "success",
      sql: expectedResult1,
    });
  });
});
