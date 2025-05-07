import { describe, expect, test } from "@jest/globals";
import {
  ComparisonOperator,
  DataType,
  DeleteStatement,
  InsertStatement,
  SelectStatement,
  Transaction,
  UpdateStatement,
} from "./ast";
import { Parser } from "./index";

describe("Parser", () => {});

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

    const parser2 = new Parser(`
      INSERT INTO columns (field_name, display_name, width, order_by) SELECT 'name_age', display_name || ' (Age)', width, order_by FROM columns WHERE field_name = 'name';`);
    const result2 = parser2.safeParse();
    const insertResult: InsertStatement = {
      type: "insert",
      tableName: "columns",
      columns: ["field_name", "display_name", "width", "order_by"],
      select: {
        type: "select",
        table: {
          name: "columns",
          type: "table-name",
        },
        columns: [
          { expr: { type: "String", value: "name_age" }, alias: undefined },
          {
            expr: {
              type: "OperatorExpression",
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
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
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
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "select",
        columns: "*",
        table: { type: "table-name", name: "tbl" },
        where: undefined,
      },
    });

    const parser1 = new Parser("SELECT MAX(order_by) + 1 FROM columns;");
    const result1 = parser1.safeParse();
    const expectedSQL: SelectStatement = {
      type: "select",
      table: {
        type: "table-name",
        name: "columns",
      },
      columns: [
        {
          expr: {
            type: "OperatorExpression",
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
      table: {
        type: "values",
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
        type: "Expression",
        isNot: false,
        expr: {
          type: "OperatorExpression",
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
        type: "In",
        isNot: false,
        target: {
          name: "id",
          type: "Reference",
        },
        values: [{ type: "Integer", value: 1 }],
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
        type: "Expression",
        isNot: false,
        expr: {
          type: "OperatorExpression",
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
        type: "Expression",
        isNot: true,
        expr: {
          type: "OperatorExpression",
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

  test("Test CAST aggregate function", () => {
    const parser = new Parser(
      `UPDATE main_data SET age = '85' WHERE CAST(age AS INTEGER) > 90;`
    );
    const result = parser.safeParse();
    const expectedSQL: UpdateStatement = {
      type: "update",
      set: [
        {
          column: "age",
          value: {
            type: "String",
            value: "85",
          },
        },
      ],
      tableName: "main_data",
      where: {
        type: "Expression",
        isNot: false,
        expr: {
          type: "OperatorExpression",
          operator: {
            type: "GreaterThan",
            value: ">",
          },
          left: {
            type: "Cast",
            expr: {
              type: "Reference",
              name: "age",
            },
            as: DataType.Integer,
          },
          right: {
            type: "Integer",
            value: 90,
          },
        },
      },
    };
    expect(result).toEqual({
      type: "success",
      sql: expectedSQL,
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
            type: "Expression",
            isNot: false,
            expr: {
              type: "OperatorExpression",
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

  test("Test where clause", () => {
    const comparisonResult = (operator: ComparisonOperator) => {
      const selectStmt: SelectStatement = {
        type: "select",
        table: { type: "table-name", name: "employees" },
        columns: "*",
        where: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
            left: { name: "salary", type: "Reference" },
            operator,
            right: { type: "Integer", value: 5000 },
          },
        },
      };
      return {
        type: "success",
        sql: selectStmt,
      };
    };
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
    const selectStmt: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Logic",
        key: "and",
        isNot: false,
        left: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
            operator: { type: "GreaterThan", value: ">" },
            left: { name: "salary", type: "Reference" },
            right: { type: "Integer", value: 5000 },
          },
        },
        right: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
            operator: { type: "LessThan", value: "<" },
            left: { name: "age", type: "Reference" },
            right: { type: "Integer", value: 30 },
          },
        },
      },
    };
    expect(logic1).toEqual({
      type: "success",
      sql: selectStmt,
    });

    const logic2 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 OR age < 30;"
    ).safeParse();
    const selectStmt2: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Logic",
        key: "or",
        isNot: false,
        left: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
            operator: { type: "GreaterThan", value: ">" },
            left: { name: "salary", type: "Reference" },
            right: { type: "Integer", value: 5000 },
          },
        },
        right: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
            operator: { type: "LessThan", value: "<" },
            left: { name: "age", type: "Reference" },
            right: { type: "Integer", value: 30 },
          },
        },
      },
    };
    expect(logic2).toEqual({
      type: "success",
      sql: selectStmt2,
    });
    const logic3 = new Parser(
      "SELECT * FROM employees WHERE NOT salary > 5000;"
    ).safeParse();
    const selectStmt3: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Expression",
        isNot: true,
        expr: {
          type: "OperatorExpression",
          operator: { type: "GreaterThan", value: ">" },
          left: { name: "salary", type: "Reference" },
          right: { type: "Integer", value: 5000 },
        },
      },
    };
    expect(logic3).toEqual({
      type: "success",
      sql: selectStmt3,
    });

    const in1 = new Parser(
      "SELECT * FROM employees WHERE salary IN (5000, 10000);"
    ).safeParse();
    const selectStmtIn: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "In",
        isNot: false,
        target: { name: "salary", type: "Reference" },
        values: [
          { type: "Integer", value: 5000 },
          { type: "Integer", value: 10000 },
        ],
      },
    };
    expect(in1).toEqual({
      type: "success",
      sql: selectStmtIn,
    });
    const in2 = new Parser(
      "SELECT * FROM employees WHERE salary NOT IN (5000, 10000);"
    ).safeParse();
    const selectStmtIn2: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "In",
        isNot: true,
        target: { name: "salary", type: "Reference" },
        values: [
          { type: "Integer", value: 5000 },
          { type: "Integer", value: 10000 },
        ],
      },
    };
    expect(in2).toEqual({
      type: "success",
      sql: selectStmtIn2,
    });

    const between1 = new Parser(
      "SELECT * FROM employees WHERE salary BETWEEN 5000 AND 10000;"
    ).safeParse();
    const selectStmtBetween: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Between",
        isNot: false,
        target: { name: "salary", type: "Reference" },
        lowerBound: { type: "Integer", value: 5000 },
        upperBound: { type: "Integer", value: 10000 },
      },
    };
    expect(between1).toEqual({
      type: "success",
      sql: selectStmtBetween,
    });
    const between2 = new Parser(
      "SELECT * FROM employees WHERE salary NOT BETWEEN 5000 AND 10000;"
    ).safeParse();
    const selectStmtBetween2: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Between",
        isNot: true,
        target: { name: "salary", type: "Reference" },
        lowerBound: { type: "Integer", value: 5000 },
        upperBound: { type: "Integer", value: 10000 },
      },
    };
    expect(between2).toEqual({
      type: "success",
      sql: selectStmtBetween2,
    });
    const between3 = new Parser(
      "SELECT * FROM employees WHERE NOT salary NOT BETWEEN 5000 AND 10000;"
    ).safeParse();
    const selectStmtBetween3: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Between",
        isNot: false,
        target: { name: "salary", type: "Reference" },
        lowerBound: { type: "Integer", value: 5000 },
        upperBound: { type: "Integer", value: 10000 },
      },
    };
    expect(between3).toEqual({
      type: "success",
      sql: selectStmtBetween3,
    });

    const isNull1 = new Parser(
      "SELECT * FROM employees WHERE salary IS NULL;"
    ).safeParse();
    const selectStmtIsNull: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Is",
        isNot: false,
        target: { name: "salary", type: "Reference" },
        value: { type: "Null" },
      },
    };
    expect(isNull1).toEqual({
      type: "success",
      sql: selectStmtIsNull,
    });
    const isNotNull1 = new Parser(
      "SELECT * FROM employees WHERE salary IS Not NULL;"
    ).safeParse();
    const selectStmtIsNotNull: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Is",
        isNot: true,
        target: { name: "salary", type: "Reference" },
        value: { type: "Null" },
      },
    };
    expect(isNotNull1).toEqual({
      type: "success",
      sql: selectStmtIsNotNull,
    });
    const notIsNotNull = new Parser(
      "SELECT * FROM employees WHERE NOT salary IS Not NULL;"
    ).safeParse();
    const selectStmtNotIsNotNull: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Is",
        isNot: false,
        target: { name: "salary", type: "Reference" },
        value: { type: "Null" },
      },
    };
    expect(notIsNotNull).toEqual({
      type: "success",
      sql: selectStmtNotIsNotNull,
    });

    const mixture1 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND age < 30 OR name = 'John';"
    ).safeParse();
    const mixtureSelectStmt: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Logic",
        key: "and",
        isNot: false,
        left: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
            operator: { type: "GreaterThan", value: ">" },
            left: { name: "salary", type: "Reference" },
            right: { type: "Integer", value: 5000 },
          },
        },
        right: {
          type: "Logic",
          key: "or",
          isNot: false,
          left: {
            type: "Expression",
            isNot: false,
            expr: {
              type: "OperatorExpression",
              operator: { type: "LessThan", value: "<" },
              left: { name: "age", type: "Reference" },
              right: { type: "Integer", value: 30 },
            },
          },
          right: {
            type: "Expression",
            isNot: false,
            expr: {
              type: "OperatorExpression",
              operator: { type: "Equals", value: "=" },
              left: { name: "name", type: "Reference" },
              right: { type: "String", value: "John" },
            },
          },
        },
      },
    };
    expect(mixture1).toEqual({
      type: "success",
      sql: mixtureSelectStmt,
    });
    const mixture2 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND (age < 30 OR name = 'John');"
    ).safeParse();
    const mixtureSelectStmt2: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Logic",
        key: "and",
        isNot: false,
        left: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
            operator: { type: "GreaterThan", value: ">" },
            left: { name: "salary", type: "Reference" },
            right: { type: "Integer", value: 5000 },
          },
        },
        right: {
          type: "Logic",
          key: "or",
          isNot: false,
          left: {
            type: "Expression",
            isNot: false,
            expr: {
              type: "OperatorExpression",
              operator: { type: "LessThan", value: "<" },
              left: { name: "age", type: "Reference" },
              right: { type: "Integer", value: 30 },
            },
          },
          right: {
            type: "Expression",
            isNot: false,
            expr: {
              type: "OperatorExpression",
              operator: { type: "Equals", value: "=" },
              left: { name: "name", type: "Reference" },
              right: { type: "String", value: "John" },
            },
          },
        },
      },
    };
    expect(mixture2).toEqual({
      type: "success",
      sql: mixtureSelectStmt2,
    });
    const mixture3 = new Parser(
      "SELECT * FROM employees WHERE (salary > 5000 AND age < 30) OR name = 'John';"
    ).safeParse();
    const mixtureSelectStmt3: SelectStatement = {
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
            type: "Expression",
            isNot: false,
            expr: {
              type: "OperatorExpression",
              operator: { type: "GreaterThan", value: ">" },
              left: { name: "salary", type: "Reference" },
              right: { type: "Integer", value: 5000 },
            },
          },
          right: {
            type: "Expression",
            isNot: false,
            expr: {
              type: "OperatorExpression",
              operator: { type: "LessThan", value: "<" },
              left: { name: "age", type: "Reference" },
              right: { type: "Integer", value: 30 },
            },
          },
        },
        right: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
            operator: { type: "Equals", value: "=" },
            left: { name: "name", type: "Reference" },
            right: { type: "String", value: "John" },
          },
        },
      },
    };
    expect(mixture3).toEqual({
      type: "success",
      sql: mixtureSelectStmt3,
    });
    const mixture4 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND NOT (age < 30 OR name = 'John');"
    ).safeParse();
    const mixtureSelectStmt4: SelectStatement = {
      type: "select",
      table: { type: "table-name", name: "employees" },
      columns: "*",
      where: {
        type: "Logic",
        key: "and",
        isNot: true,
        left: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
            operator: { type: "GreaterThan", value: ">" },
            left: { name: "salary", type: "Reference" },
            right: { type: "Integer", value: 5000 },
          },
        },
        right: {
          type: "Logic",
          key: "or",
          isNot: false,
          left: {
            type: "Expression",
            isNot: false,
            expr: {
              type: "OperatorExpression",
              operator: { type: "LessThan", value: "<" },
              left: { name: "age", type: "Reference" },
              right: { type: "Integer", value: 30 },
            },
          },
          right: {
            type: "Expression",
            isNot: false,
            expr: {
              type: "OperatorExpression",
              operator: { type: "Equals", value: "=" },
              left: { name: "name", type: "Reference" },
              right: { type: "String", value: "John" },
            },
          },
        },
      },
    };
    expect(mixture4).toEqual({
      type: "success",
      sql: mixtureSelectStmt4,
    });
  });

  // 测试子查询
  test("Test subquery", () => {
    const parser = new Parser(
      "SELECT * FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);"
    );
    const result = parser.safeParse();
    const selectStmt: SelectStatement = {
      type: "select",
      columns: "*",
      table: { type: "table-name", name: "employees" },
      where: {
        type: "Expression",
        isNot: false,
        expr: {
          type: "OperatorExpression",
          operator: { type: "GreaterThan", value: ">" },
          left: { name: "salary", type: "Reference" },
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
                },
              ],
              table: { type: "table-name", name: "employees" },
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
              type: "OperatorExpression",
              operator: { type: "StringConcatenation", value: "||" },
              left: { type: "Reference", name: "display_name" },
              right: {
                type: "OperatorExpression",
                operator: { type: "StringConcatenation", value: "||" },
                left: { type: "String", value: " (" },
                right: {
                  type: "OperatorExpression",
                  operator: { type: "StringConcatenation", value: "||" },
                  left: {
                    type: "SubqueryExpression",
                    stmt: {
                      type: "select",
                      columns: [
                        { expr: { type: "Reference", name: "display_name" } },
                      ],
                      table: { type: "table-name", name: "columns" },
                      // where: {
                      //   type: "Comparison",
                      //   isNot: false,
                      //   operator: { type: "Equals", value: "=" },
                      //   left: { type: "Reference", name: "field_name" },
                      //   right: { type: "String", value: "age" },
                      // },
                      where: {
                        type: "Expression",
                        isNot: false,
                        expr: {
                          type: "OperatorExpression",
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
        table: { type: "table-name", name: "columns" },
        where: {
          type: "Expression",
          isNot: false,
          expr: {
            type: "OperatorExpression",
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
