import { describe, expect, test } from "@jest/globals";
import { Parser } from "./parser";
import { ComparisonOperator, SelectStatement } from "./ast";

describe("Parser clause", () => {
  test("should parse WHERE clause", () => {
    const sql = "SELECT * FROM table_name WHERE column_name = 'value';";
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: "*",
      where: {
        type: "Expression",
        isNot: false,
        expr: {
          type: "OperatorExpression",
          operator: { type: "Equals", value: "=" },
          left: {
            type: "Reference",
            name: "column_name",
          },
          right: {
            type: "String",
            value: "value",
          },
        },
      },
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
  });

  test("Test where clause", () => {
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
      from: [{ type: "table-name", name: "employees" }],
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
});

const comparisonResult = (operator: ComparisonOperator) => {
  const selectStmt: SelectStatement = {
    type: "select",
    from: [{ type: "table-name", name: "employees" }],
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
