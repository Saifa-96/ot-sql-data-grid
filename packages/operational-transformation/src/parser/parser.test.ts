import { describe, expect, test } from "@jest/globals";
import { ComparisonOperator, DataType, SelectStatement } from "./ast";
import { Parser } from "./index";

describe("Test Parser", () => {
  test("Test simple create table sql text", () => {
    const parser = new Parser(`
        create table tbl (
            id1 int primary key,
            id2 integer
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
  });

  test("Test simple select sql text", () => {
    const parser = new Parser(`select * from tbl;`);
    const result = parser.safeParse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "select",
        columns: "*",
        table: { type: "table-name", name: "tbl" },
        where: undefined,
      },
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
      table: {
        type: 'values',
        values: [
          [
            { type: "Integer", value: 1 },
            { type: "String", value: "Alice" },
            { type: "Integer", value: 5000 },
            {
              type: "OperatorExpression",
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
              type: "OperatorExpression",
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
              type: "OperatorExpression",
              operator: { type: "Asterisk", value: "*" },
              left: { type: "Integer", value: 7000 },
              right: { type: "Float", value: 0.2 },
            },
          ],
        ],
        columns: ["emp_id", "emp_name", "base_salary", "incentive"],
        tempTableName: "my_data",
      },
      where: {
        type: "Comparison",
        isNot: false,
        operator: { type: "GreaterThan", value: ">" },
        left: { type: "Reference", name: "incentive" },
        right: { type: "Integer", value: 500 },
      },
    };
    expect(result3).toEqual({ type: "success", sql: expectedResult3 });
  });

  test("Test simple delete sql text", () => {
    const parser = new Parser(`delete from tbl where id in (1);`);
    const result = parser.safeParse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "delete",
        tableName: "tbl",
        where: {
          type: "In",
          isNot: false,
          reference: {
            name: "id",
            type: "Reference",
          },
          exprs: [{ type: "Integer", value: 1 }],
        },
      },
    });
  });

  test("Test simple update sql text", () => {
    const parser = new Parser(
      `update tbl set id = 1, test = '123123' where name = 1;`
    );
    const result = parser.safeParse();
    expect(result).toEqual({
      type: "success",
      sql: {
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
          type: "Comparison",
          isNot: false,
          left: {
            name: "name",
            type: "Reference",
          },
          operator: { type: "Equals", value: "=" },
          right: {
            type: "Integer",
            value: 1,
          },
        },
      },
    });

    const parser2 = new Parser(`update tbl set id = 1 where not name = 1;`);
    const result2 = parser2.safeParse();
    expect(result2).toEqual({
      type: "success",
      sql: {
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
          left: {
            name: "name",
            type: "Reference",
          },
          operator: { type: "Equals", value: "=" },
          right: {
            type: "Integer",
            value: 1,
          },
          isNot: true,
          type: "Comparison",
        },
      },
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
    expect(result2).toEqual({
      type: "success",
      sql: {
        type: "transaction",
        stmts: [
          {
            type: "alter",
            tableName: "main_data",
            column: {
              name: "name_gender",
              default: undefined,
              nullable: undefined,
              datatype: "STRING",
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
                  type: "OperatorExpression",
                  operator: { type: "StringConcatenation", value: "||" },
                  left: { type: "Reference", name: "name" },
                  right: {
                    type: "OperatorExpression",
                    operator: { type: "StringConcatenation", value: "||" },
                    left: { type: "String", value: "(" },
                    right: {
                      type: "OperatorExpression",
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
              type: "In",
              isNot: false,
              reference: {
                name: "id",
                type: "Reference",
              },
              exprs: [
                { type: "String", value: "name" },
                { type: "String", value: "gender" },
              ],
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
                  type: "OperatorExpression",
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
              type: "Comparison",
              isNot: false,
              operator: {
                type: "GreaterThan",
                value: ">",
              },
              left: {
                type: "Reference",
                name: "order_by",
              },
              right: {
                type: "Integer",
                value: 20000,
              },
            },
          },
        ],
      },
    });
  });

  test("Test where clause", () => {
    const comparisonResult = (operator: ComparisonOperator) => ({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Comparison",
          isNot: false,
          left: {
            name: "salary",
            type: "Reference",
          },
          operator,
          right: {
            type: "Integer",
            value: 5000,
          },
        },
      },
    });
    const comparison1 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000;"
    ).safeParse();
    expect(comparison1).toEqual(
      comparisonResult({ type: "GreaterThan", value: ">" })
    );

    const comparison2 = new Parser(
      "SELECT * FROM employees WHERE salary < 5000;"
    ).safeParse();
    expect(comparison2).toEqual(
      comparisonResult({ type: "LessThan", value: "<" })
    );

    const comparison3 = new Parser(
      "SELECT * FROM employees WHERE salary = 5000;"
    ).safeParse();
    expect(comparison3).toEqual(
      comparisonResult({ type: "Equals", value: "=" })
    );

    const comparison4 = new Parser(
      "SELECT * FROM employees WHERE salary >= 5000;"
    ).safeParse();
    expect(comparison4).toEqual(
      comparisonResult({ type: "GreaterThanOrEqual", value: ">=" })
    );

    const comparison5 = new Parser(
      "SELECT * FROM employees WHERE salary <= 5000;"
    ).safeParse();
    expect(comparison5).toEqual(
      comparisonResult({ type: "LessThanOrEqual", value: "<=" })
    );

    const comparison6 = new Parser(
      "SELECT * FROM employees WHERE salary <> 5000;"
    ).safeParse();
    expect(comparison6).toEqual(
      comparisonResult({ type: "NotEquals", value: "<>" })
    );

    const comparison7 = new Parser(
      "SELECT * FROM employees WHERE salary != 5000;"
    ).safeParse();
    expect(comparison7).toEqual(
      comparisonResult({ type: "NotEquals", value: "<>" })
    );

    const logic1 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND age < 30;"
    ).safeParse();
    expect(logic1).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Logic",
          key: "and",
          isNot: false,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: "GreaterThan", value: ">" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Comparison",
            isNot: false,
            left: { name: "age", type: "Reference" },
            operator: { type: "LessThan", value: "<" },
            right: { type: "Integer", value: 30 },
          },
        },
      },
    });

    const logic2 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 OR age < 30;"
    ).safeParse();
    expect(logic2).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Logic",
          key: "or",
          isNot: false,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: "GreaterThan", value: ">" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Comparison",
            isNot: false,
            left: { name: "age", type: "Reference" },
            operator: { type: "LessThan", value: "<" },
            right: { type: "Integer", value: 30 },
          },
        },
      },
    });
    const logic3 = new Parser(
      "SELECT * FROM employees WHERE NOT salary > 5000;"
    ).safeParse();
    expect(logic3).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Comparison",
          isNot: true,
          left: { name: "salary", type: "Reference" },
          operator: { type: "GreaterThan", value: ">" },
          right: { type: "Integer", value: 5000 },
        },
      },
    });

    const in1 = new Parser(
      "SELECT * FROM employees WHERE salary IN (5000, 10000);"
    ).safeParse();
    expect(in1).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "In",
          isNot: false,
          reference: { name: "salary", type: "Reference" },
          exprs: [
            { type: "Integer", value: 5000 },
            { type: "Integer", value: 10000 },
          ],
        },
      },
    });
    const in2 = new Parser(
      "SELECT * FROM employees WHERE salary NOT IN (5000, 10000);"
    ).safeParse();
    expect(in2).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "In",
          isNot: true,
          reference: { name: "salary", type: "Reference" },
          exprs: [
            { type: "Integer", value: 5000 },
            { type: "Integer", value: 10000 },
          ],
        },
      },
    });

    const between1 = new Parser(
      "SELECT * FROM employees WHERE salary BETWEEN 5000 AND 10000;"
    ).safeParse();
    expect(between1).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Between",
          isNot: false,
          reference: { name: "salary", type: "Reference" },
          left: { type: "Integer", value: 5000 },
          right: { type: "Integer", value: 10000 },
        },
      },
    });
    const between2 = new Parser(
      "SELECT * FROM employees WHERE salary NOT BETWEEN 5000 AND 10000;"
    ).safeParse();
    expect(between2).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Between",
          isNot: true,
          reference: { name: "salary", type: "Reference" },
          left: { type: "Integer", value: 5000 },
          right: { type: "Integer", value: 10000 },
        },
      },
    });
    const between3 = new Parser(
      "SELECT * FROM employees WHERE NOT salary NOT BETWEEN 5000 AND 10000;"
    ).safeParse();
    expect(between3).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Between",
          isNot: false,
          reference: { name: "salary", type: "Reference" },
          left: { type: "Integer", value: 5000 },
          right: { type: "Integer", value: 10000 },
        },
      },
    });

    const isNull1 = new Parser(
      "SELECT * FROM employees WHERE salary IS NULL;"
    ).safeParse();
    expect(isNull1).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Is-Null",
          isNot: false,
          reference: { name: "salary", type: "Reference" },
        },
      },
    });
    const isNotNull1 = new Parser(
      "SELECT * FROM employees WHERE salary IS Not NULL;"
    ).safeParse();
    expect(isNotNull1).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Is-Null",
          isNot: true,
          reference: { name: "salary", type: "Reference" },
        },
      },
    });
    const notIsNotNull = new Parser(
      "SELECT * FROM employees WHERE NOT salary IS Not NULL;"
    ).safeParse();
    expect(notIsNotNull).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Is-Null",
          isNot: false,
          reference: { name: "salary", type: "Reference" },
        },
      },
    });

    const mixture1 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND age < 30 OR name = 'John';"
    ).safeParse();
    expect(mixture1).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Logic",
          key: "and",
          isNot: false,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: "GreaterThan", value: ">" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Logic",
            key: "or",
            isNot: false,
            left: {
              type: "Comparison",
              isNot: false,
              left: { name: "age", type: "Reference" },
              operator: { type: "LessThan", value: "<" },
              right: { type: "Integer", value: 30 },
            },
            right: {
              type: "Comparison",
              isNot: false,
              left: { name: "name", type: "Reference" },
              operator: { type: "Equals", value: "=" },
              right: { type: "String", value: "John" },
            },
          },
        },
      },
    });
    const mixture2 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND (age < 30 OR name = 'John');"
    ).safeParse();
    expect(mixture2).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Logic",
          key: "and",
          isNot: false,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: "GreaterThan", value: ">" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Logic",
            key: "or",
            isNot: false,
            left: {
              type: "Comparison",
              isNot: false,
              left: { name: "age", type: "Reference" },
              operator: { type: "LessThan", value: "<" },
              right: { type: "Integer", value: 30 },
            },
            right: {
              type: "Comparison",
              isNot: false,
              left: { name: "name", type: "Reference" },
              operator: { type: "Equals", value: "=" },
              right: { type: "String", value: "John" },
            },
          },
        },
      },
    });
    const mixture3 = new Parser(
      "SELECT * FROM employees WHERE (salary > 5000 AND age < 30) OR name = 'John';"
    ).safeParse();
    expect(mixture3).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Logic",
          key: "or",
          isNot: false,
          left: {
            type: "Logic",
            key: "and",
            isNot: false,
            left: {
              type: "Comparison",
              isNot: false,
              left: { name: "salary", type: "Reference" },
              operator: { type: "GreaterThan", value: ">" },
              right: { type: "Integer", value: 5000 },
            },
            right: {
              type: "Comparison",
              isNot: false,
              left: { name: "age", type: "Reference" },
              operator: { type: "LessThan", value: "<" },
              right: { type: "Integer", value: 30 },
            },
          },
          right: {
            type: "Comparison",
            isNot: false,
            left: { name: "name", type: "Reference" },
            operator: { type: "Equals", value: "=" },
            right: { type: "String", value: "John" },
          },
        },
      },
    });
    const mixture4 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND NOT (age < 30 OR name = 'John');"
    ).safeParse();
    expect(mixture4).toEqual({
      type: "success",
      sql: {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Logic",
          key: "and",
          isNot: true,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: "GreaterThan", value: ">" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Logic",
            key: "or",
            isNot: false,
            left: {
              type: "Comparison",
              isNot: false,
              left: { name: "age", type: "Reference" },
              operator: { type: "LessThan", value: "<" },
              right: { type: "Integer", value: 30 },
            },
            right: {
              type: "Comparison",
              isNot: false,
              left: { name: "name", type: "Reference" },
              operator: { type: "Equals", value: "=" },
              right: { type: "String", value: "John" },
            },
          },
        },
      },
    });
  });

  // 测试子查询
  test("Test subquery", () => {
    const parser = new Parser(
      "SELECT * FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);"
    );
    const result = parser.safeParse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "select",
        columns: "*",
        table: { type: "table-name", name: "employees" },
        where: {
          type: "Comparison",
          isNot: false,
          operator: { type: "GreaterThan", value: ">" },
          left: { type: "Reference", name: "salary" },
          right: {
            type: "SubqueryExpression",
            stmt: {
              type: "select",
              columns: [
                {
                  expr: {
                    type: "Avg",
                    expr: { type: "Reference", name: "salary" },
                  },
                  alias: undefined,
                },
              ],
              table: { type: "table-name", name: "employees" },
              where: undefined,
            },
          },
        },
      },
    });
  });
});
