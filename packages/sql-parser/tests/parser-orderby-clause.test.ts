import { describe, expect, test } from "vitest";
import { Parser } from "../src/parser";
import { SelectStatement } from "../src/ast";

describe("Parser order by clause", () => {
  test("should parse complex order by clause.", () => {
    const sql = `
SELECT 
    user_id, 
    username, 
    registration_date, 
    status, 
    purchase_amount
FROM 
    users
ORDER BY 
    CASE 
        WHEN status = 'active' THEN 1
        WHEN status = 'pending' THEN 2
        ELSE 3
    END,
    
    (purchase_amount * 0.8) DESC,
    
    CASE
        WHEN purchase_amount > 1000 THEN purchase_amount * 2
        WHEN purchase_amount BETWEEN 500 AND 1000 THEN purchase_amount * 1.5
        ELSE purchase_amount 
    END DESC,
    
    username ASC;
  `;

    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "users" }],
      columns: [
        { expr: { type: "Reference", name: "user_id" } },
        { expr: { type: "Reference", name: "username" } },
        { expr: { type: "Reference", name: "registration_date" } },
        { expr: { type: "Reference", name: "status" } },
        { expr: { type: "Reference", name: "purchase_amount" } },
      ],
      orderBy: [
        {
          expr: {
            type: "Case",
            cases: [
              {
                when: {
                  type: "Binary",
                  operator: { type: "Equals", value: "=" },
                  left: { type: "Reference", name: "status" },
                  right: { type: "String", value: "active" },
                },
                then: { type: "Integer", value: 1 },
              },
              {
                when: {
                  type: "Binary",
                  operator: { type: "Equals", value: "=" },
                  left: { type: "Reference", name: "status" },
                  right: { type: "String", value: "pending" },
                },
                then: { type: "Integer", value: 2 },
              },
            ],
            else: { type: "Integer", value: 3 },
          },
        },
        {
          expr: {
            type: "Binary",
            priority: true,
            operator: { type: "Asterisk", value: "*" },
            left: { type: "Reference", name: "purchase_amount" },
            right: { type: "Float", value: 0.8 },
          },
          order: "desc",
        },
        {
          expr: {
            type: "Case",
            cases: [
              {
                when: {
                  type: "Binary",
                  operator: { type: "GreaterThan", value: ">" },
                  left: { type: "Reference", name: "purchase_amount" },
                  right: { type: "Integer", value: 1000 },
                },
                then: {
                  type: "Binary",
                  operator: { type: "Asterisk", value: "*" },
                  left: { type: "Reference", name: "purchase_amount" },
                  right: { type: "Integer", value: 2 },
                },
              },
              {
                when: {
                  type: "Between",
                  not: false,
                  target: { type: "Reference", name: "purchase_amount" },
                  lowerBound: { type: "Integer", value: 500 },
                  upperBound: { type: "Integer", value: 1000 },
                },
                then: {
                  type: "Binary",
                  operator: { type: "Asterisk", value: "*" },
                  left: { type: "Reference", name: "purchase_amount" },
                  right: { type: "Float", value: 1.5 },
                },
              },
            ],
            else: { type: "Reference", name: "purchase_amount" },
          },
          order: "desc",
        },

        {
          expr: { type: "Reference", name: "username" },
          order: "asc",
        },
      ],
    };

    expect(new Parser(sql).safeParse()).toEqual({
      type: "success",
      sql: expected,
    });
  });

  test("should parse ORDER BY clause with ASC", () => {
    const sql = "SELECT * FROM table_name ORDER BY column_name ASC;";
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: "*",
      orderBy: [
        {
          expr: { type: "Reference", name: "column_name" },
          order: "asc",
        },
      ],
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
  });

  test("should parse ORDER BY clause with DESC", () => {
    const sql = "SELECT * FROM table_name ORDER BY column_name DESC;";
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: "*",
      orderBy: [
        {
          expr: { type: "Reference", name: "column_name" },
          order: "desc",
        },
      ],
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
  });

  test("should parse ORDER BY clause with multiple columns", () => {
    const sql = "SELECT * FROM table_name ORDER BY column1 ASC, column2 DESC;";
    const expected: SelectStatement = {
      type: "select",
      from: [{ type: "table-name", name: "table_name" }],
      columns: "*",
      orderBy: [
        {
          expr: { type: "Reference", name: "column1" },
          order: "asc",
        },
        {
          expr: { type: "Reference", name: "column2" },
          order: "desc",
        },
      ],
    };
    const result = new Parser(sql).safeParse();
    expect(result).toEqual({
      type: "success",
      sql: expected,
    });
  });
});
