import { describe, expect, test } from "@jest/globals";
import { DataType } from "./ast";
import { Parser } from "./index";
import { ComparisonOperator, TokenType } from "./token";

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
        insert into tbl (id1, id2) values (1, 2), (true, null);`);
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
          [{ type: "Boolean", value: true }, { type: "Null" }],
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
        tableName: "tbl",
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
          datatype: 1,
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
  });

  test("Test simple delete sql text", () => {
    const parser = new Parser(`delete from tbl where id in (1);`);
    const result = parser.safeParse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "delete",
        tableName: "tbl",
        columnName: "id",
        values: [{ type: "Integer", value: 1 }],
      },
    });
  });

  test("Test simple update sql text", () => {
    const parser = new Parser(
      `update tbl set id = 1, test = "123123" where name = 1;`
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
          operator: { type: "Equals" },
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
          operator: { type: "Equals" },
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
              datatype: 3,
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
                  operator: { type: "StringConcatenation" },
                  left: { type: "Reference", name: "name" },
                  right: {
                    type: "OperatorExpression",
                    operator: { type: "StringConcatenation" },
                    left: { type: "String", value: "(" },
                    right: {
                      type: "OperatorExpression",
                      operator: { type: "StringConcatenation" },
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
            columnName: "id",
            values: [
              {
                type: "String",
                value: "name",
              },
              {
                type: "String",
                value: "gender",
              },
            ],
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
        tableName: "employees",
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
      comparisonResult({ type: TokenType.GreaterThan })
    );

    const comparison2 = new Parser(
      "SELECT * FROM employees WHERE salary < 5000;"
    ).safeParse();
    expect(comparison2).toEqual(comparisonResult({ type: TokenType.LessThan }));

    const comparison3 = new Parser(
      "SELECT * FROM employees WHERE salary = 5000;"
    ).safeParse();
    expect(comparison3).toEqual(comparisonResult({ type: TokenType.Equals }));

    const comparison4 = new Parser(
      "SELECT * FROM employees WHERE salary >= 5000;"
    ).safeParse();
    expect(comparison4).toEqual(
      comparisonResult({ type: TokenType.GreaterThanOrEqual })
    );

    const comparison5 = new Parser(
      "SELECT * FROM employees WHERE salary <= 5000;"
    ).safeParse();
    expect(comparison5).toEqual(
      comparisonResult({ type: TokenType.LessThanOrEqual })
    );

    const comparison6 = new Parser(
      "SELECT * FROM employees WHERE salary <> 5000;"
    ).safeParse();
    expect(comparison6).toEqual(
      comparisonResult({ type: TokenType.NotEquals })
    );

    const comparison7 = new Parser(
      "SELECT * FROM employees WHERE salary != 5000;"
    ).safeParse();
    expect(comparison7).toEqual(
      comparisonResult({ type: TokenType.NotEquals })
    );

    const logic1 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND age < 30;"
    ).safeParse();
    expect(logic1).toEqual({
      type: "success",
      sql: {
        type: "select",
        tableName: "employees",
        columns: "*",
        where: {
          type: "Logic",
          key: "and",
          isNot: false,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: TokenType.GreaterThan },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Comparison",
            isNot: false,
            left: { name: "age", type: "Reference" },
            operator: { type: TokenType.LessThan },
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
        tableName: "employees",
        columns: "*",
        where: {
          type: "Logic",
          key: "or",
          isNot: false,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: TokenType.GreaterThan },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Comparison",
            isNot: false,
            left: { name: "age", type: "Reference" },
            operator: { type: TokenType.LessThan },
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
        tableName: "employees",
        columns: "*",
        where: {
          type: "Comparison",
          isNot: true,
          left: { name: "salary", type: "Reference" },
          operator: { type: TokenType.GreaterThan },
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
        tableName: "employees",
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
        tableName: "employees",
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
        tableName: "employees",
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
        tableName: "employees",
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
        tableName: "employees",
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
        tableName: "employees",
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
        tableName: "employees",
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
        tableName: "employees",
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
        tableName: "employees",
        columns: "*",
        where: {
          type: "Logic",
          key: "and",
          isNot: false,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: TokenType.GreaterThan },
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
              operator: { type: TokenType.LessThan },
              right: { type: "Integer", value: 30 },
            },
            right: {
              type: "Comparison",
              isNot: false,
              left: { name: "name", type: "Reference" },
              operator: { type: TokenType.Equals },
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
        tableName: "employees",
        columns: "*",
        where: {
          type: "Logic",
          key: "and",
          isNot: false,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: TokenType.GreaterThan },
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
              operator: { type: TokenType.LessThan },
              right: { type: "Integer", value: 30 },
            },
            right: {
              type: "Comparison",
              isNot: false,
              left: { name: "name", type: "Reference" },
              operator: { type: TokenType.Equals },
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
        tableName: "employees",
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
              operator: { type: TokenType.GreaterThan },
              right: { type: "Integer", value: 5000 },
            },
            right: {
              type: "Comparison",
              isNot: false,
              left: { name: "age", type: "Reference" },
              operator: { type: TokenType.LessThan },
              right: { type: "Integer", value: 30 },
            },
          },
          right: {
            type: "Comparison",
            isNot: false,
            left: { name: "name", type: "Reference" },
            operator: { type: TokenType.Equals },
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
        tableName: "employees",
        columns: "*",
        where: {
          type: "Logic",
          key: "and",
          isNot: true,
          left: {
            type: "Comparison",
            isNot: false,
            left: { name: "salary", type: "Reference" },
            operator: { type: TokenType.GreaterThan },
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
              operator: { type: TokenType.LessThan },
              right: { type: "Integer", value: 30 },
            },
            right: {
              type: "Comparison",
              isNot: false,
              left: { name: "name", type: "Reference" },
              operator: { type: TokenType.Equals },
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
        tableName: "employees",
        where: {
          type: "Comparison",
          isNot: false,
          operator: { type: "GreaterThan" },
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
              tableName: "employees",
              where: undefined,
            },
          },
        },
      },
    });
  });
});
