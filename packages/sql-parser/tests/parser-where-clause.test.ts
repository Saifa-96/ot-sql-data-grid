import { describe, expect, test } from "vitest";
import { Parser } from "../src/parser";
import { ComparisonOperator, SelectStatement } from "../src/ast";

describe("Parser clause", () => {
  test("should parse Binary Equals", () => {
    const sql = "SELECT * FROM table_name WHERE column_name = 'value';";
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: "*",
      where: {
        not: false,
        expr: {
          type: "Binary",
          operator: { type: "Equals", value: "=" },
          left: { name: "column_name", type: "Reference" },
          right: { type: "String", value: "value" },
        },
      },
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
  });

  test("should parse Binary GreaterThan", () => {
    const comparison1 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000;"
    ).safeParse();
    expect(comparison1).toEqual(
      comparisonResult({ type: "GreaterThan", value: ">" })
    );
  });

  test("should parse Binary LessThan", () => {
    const comparison2 = new Parser(
      "SELECT * FROM employees WHERE salary < 5000;"
    ).safeParse();
    expect(comparison2).toEqual(
      comparisonResult({ type: "LessThan", value: "<" })
    );
  });

  test("should parse Binary GreaterThanOrEqual", () => {
    const comparison3 = new Parser(
      "SELECT * FROM employees WHERE salary = 5000;"
    ).safeParse();
    expect(comparison3).toEqual(
      comparisonResult({ type: "Equals", value: "=" })
    );
  });

  test("should parse Binary LessThanOrEqual", () => {
    const comparison4 = new Parser(
      "SELECT * FROM employees WHERE salary >= 5000;"
    ).safeParse();
    expect(comparison4).toEqual(
      comparisonResult({ type: "GreaterThanOrEqual", value: ">=" })
    );
  });

  test("should parse Binary LessThanOrEqual", () => {
    const comparison5 = new Parser(
      "SELECT * FROM employees WHERE salary <= 5000;"
    ).safeParse();
    expect(comparison5).toEqual(
      comparisonResult({ type: "LessThanOrEqual", value: "<=" })
    );
  });

  test("should parse Binary NotEquals", () => {
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
  });

  test("should parse Logic AND", () => {
    const logic1 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND age < 30;"
    ).safeParse();
    const selectStmt: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "employees" }],
      columns: "*",
      where: {
        not: false,
        expr: {
          type: "Logic",
          key: "and",
          left: {
            type: "Binary",
            operator: { type: "GreaterThan", value: ">" },
            left: { name: "salary", type: "Reference" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Binary",
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
  });

  test("should parse Logic OR", () => {
    const logic2 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 OR age < 30;"
    ).safeParse();
    const selectStmt2: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "employees" }],
      columns: "*",
      where: {
        not: false,
        expr: {
          type: "Logic",
          key: "or",
          left: {
            type: "Binary",
            operator: { type: "GreaterThan", value: ">" },
            left: { name: "salary", type: "Reference" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Binary",
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
  });

  test("should parse Not", () => {
    const logic3 = new Parser(
      "SELECT * FROM employees WHERE NOT salary > 5000;"
    ).safeParse();
    const selectStmt3: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "employees" }],
      columns: "*",
      where: {
        not: true,
        expr: {
          type: "Binary",
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
  });

  test("should parse In Expression", () => {
    const in1 = new Parser(
      "SELECT * FROM employees WHERE salary IN (5000, 10000);"
    ).safeParse();
    const selectStmtIn: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "employees" }],
      columns: "*",
      where: {
        not: false,
        expr: {
          type: "In",
          not: false,
          target: { name: "salary", type: "Reference" },
          values: [
            { type: "Integer", value: 5000 },
            { type: "Integer", value: 10000 },
          ],
        },
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
        not: false,
        expr: {
          type: "In",
          not: true,
          target: { name: "salary", type: "Reference" },
          values: [
            { type: "Integer", value: 5000 },
            { type: "Integer", value: 10000 },
          ],
        },
      },
    };
    expect(in2).toEqual({
      type: "success",
      sql: selectStmtIn2,
    });
  });

  test("should parse Between Expression", () => {
    const between1 = new Parser(
      "SELECT * FROM employees WHERE salary BETWEEN 5000 AND 10000;"
    ).safeParse();
    const selectStmtBetween: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "employees" }],
      columns: "*",
      where: {
        not: false,
        expr: {
          type: "Between",
          not: false,
          target: { name: "salary", type: "Reference" },
          lowerBound: { type: "Integer", value: 5000 },
          upperBound: { type: "Integer", value: 10000 },
        },
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
        not: false,
        expr: {
          type: "Between",
          not: true,
          target: { name: "salary", type: "Reference" },
          lowerBound: { type: "Integer", value: 5000 },
          upperBound: { type: "Integer", value: 10000 },
        },
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
        not: true,
        expr: {
          type: "Between",
          not: true,
          target: { name: "salary", type: "Reference" },
          lowerBound: { type: "Integer", value: 5000 },
          upperBound: { type: "Integer", value: 10000 },
        },
      },
    };
    expect(between3).toEqual({
      type: "success",
      sql: selectStmtBetween3,
    });
  });

  test("should parse Is Expression", () => {
    const isNull1 = new Parser(
      "SELECT * FROM employees WHERE salary IS NULL;"
    ).safeParse();
    const selectStmtIsNull: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "employees" }],
      columns: "*",
      where: {
        not: false,
        expr: {
          type: "Is",
          not: false,
          target: { name: "salary", type: "Reference" },
          value: { type: "Null" },
        },
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
        not: false,
        expr: {
          type: "Is",
          not: true,
          target: { name: "salary", type: "Reference" },
          value: { type: "Null" },
        },
      },
    };
    expect(isNotNull1).toEqual({
      type: "success",
      sql: selectStmtIsNotNull,
    });
  });

  test("should parse expressions by priority levels", () => {
    const mixture1 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND age < 30 OR name = 'John';"
    ).safeParse();
    const mixtureSelectStmt: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "employees" }],
      columns: "*",
      where: {
        not: false,
        expr: {
          type: "Logic",
          key: "and",
          left: {
            type: "Binary",
            operator: { type: "GreaterThan", value: ">" },
            left: { name: "salary", type: "Reference" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Logic",
            key: "or",
            left: {
              type: "Binary",
              operator: { type: "LessThan", value: "<" },
              left: { name: "age", type: "Reference" },
              right: { type: "Integer", value: 30 },
            },
            right: {
              type: "Binary",
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
  });

  test("should parse expressions with parentheses", () => {
    const mixture2 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND (age < 30 OR name = 'John');"
    ).safeParse();
    const mixtureSelectStmt2: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "employees" }],
      columns: "*",
      where: {
        not: false,
        expr: {
          type: "Logic",
          key: "and",
          left: {
            type: "Binary",
            operator: { type: "GreaterThan", value: ">" },
            left: { name: "salary", type: "Reference" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Logic",
            key: "or",
            priority: true,
            left: {
              type: "Binary",
              operator: { type: "LessThan", value: "<" },
              left: { name: "age", type: "Reference" },
              right: { type: "Integer", value: 30 },
            },
            right: {
              type: "Binary",
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
        not: false,
        expr: {
          type: "Logic",
          key: "or",
          left: {
            type: "Logic",
            key: "and",
            priority: true,
            left: {
              type: "Binary",
              operator: { type: "GreaterThan", value: ">" },
              left: { name: "salary", type: "Reference" },
              right: { type: "Integer", value: 5000 },
            },
            right: {
              type: "Binary",
              operator: { type: "LessThan", value: "<" },
              left: { name: "age", type: "Reference" },
              right: { type: "Integer", value: 30 },
            },
          },
          right: {
            type: "Binary",
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
  });

  test("should parse expressions with parentheses and NOT", () => {
    const mixture4 = new Parser(
      "SELECT * FROM employees WHERE salary > 5000 AND NOT (age < 30 OR name = 'John');"
    ).safeParse();
    const mixtureSelectStmt4: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "employees" }],
      columns: "*",
      where: {
        not: false,
        expr: {
          type: "Logic",
          key: "and",
          left: {
            type: "Binary",
            operator: { type: "GreaterThan", value: ">" },
            left: { type: "Reference", name: "salary" },
            right: { type: "Integer", value: 5000 },
          },
          right: {
            type: "Not",
            expr: {
              type: "Logic",
              key: "or",
              left: {
                type: "Binary",
                operator: { type: "LessThan", value: "<" },
                left: { type: "Reference", name: "age" },
                right: { type: "Integer", value: 30 },
              },
              right: {
                type: "Binary",
                operator: { type: "Equals", value: "=" },
                left: { type: "Reference", name: "name" },
                right: { type: "String", value: "John" },
              },
              priority: true,
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
      not: false,
      expr: {
        type: "Binary",
        operator,
        left: { name: "salary", type: "Reference" },
        right: { type: "Integer", value: 5000 },
      },
    },
  };
  return {
    type: "success",
    sql: selectStmt,
  };
};
