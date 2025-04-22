import { match } from "ts-pattern";

export type ComparisonOperator =
  | { type: "Equals"; value: "=" }
  | { type: "NotEquals"; value: "<>" }
  | { type: "GreaterThan"; value: ">" }
  | { type: "GreaterThanOrEqual"; value: ">=" }
  | { type: "LessThan"; value: "<" }
  | { type: "LessThanOrEqual"; value: "<=" };
export type ArithmeticOperator =
  | { type: "Asterisk"; value: "*" }
  | { type: "Plus"; value: "+" }
  | { type: "Minus"; value: "-" }
  | { type: "Slash"; value: "/" };
export type Operator =
  | ComparisonOperator
  | ArithmeticOperator
  | { type: "StringConcatenation"; value: "||" };

export enum DataType {
  Boolean = "BOOLEAN",
  Integer = "INTEGER",
  Float = "FLOAT",
  String = "STRING",
}

export interface Transaction {
  type: "transaction";
  stmts: Statement[];
}
export type Statement =
  | CreateTableStatement
  | InsertStatement
  | SelectStatement
  | AlterStatement
  | UpdateStatement
  | DeleteStatement;
export type SQL = Statement | Transaction;

export const sql2String = (sql: SQL): string => {
  return match(sql)
    .with({ type: "transaction" }, ({ stmts }) => {
      const stmtsStr = stmts.map(sql2String).join("\n");
      return `BEGIN TRANSACTION;\n${stmtsStr}\nCOMMIT;`;
    })
    .with({ type: "create-table" }, (stmt) => {
      return `CREATE TABLE ${stmt.name} (${stmt.columns
        .map(column2String)
        .join(", ")});`;
    })
    .with({ type: "insert" }, (stmt) => {
      return `INSERT INTO ${stmt.tableName} (${
        stmt.columns ? stmt.columns.join(", ") : "*"
      }) VALUES ${stmt.values
        .map((row) => `(${row.map(expression2String).join(", ")})`)
        .join(", ")};`;
    })
    .with({ type: "select" }, (stmt) => {
      const columnsStr = Array.isArray(stmt.columns)
        ? stmt.columns
            .map(
              (col) =>
                `${expression2String(col.expr)}${
                  col.alias ? ` AS ${col.alias}` : ""
                }`
            )
            .join(", ")
        : stmt.columns;
      const whereClauseStr = stmt.where
        ? ` WHERE ${condition2String(stmt.where)}`
        : "";
      const tableInfoStr = tableInfo2String(stmt.table);
      const unionAllStr = unionAll2String(stmt.unionAll);
      return `SELECT ${columnsStr}${unionAllStr}${tableInfoStr}${whereClauseStr};`;
    })
    .with({ type: "alter", action: "add" }, (stmt) => {
      const columnStr = column2String(stmt.column);
      return `ALTER TABLE ${stmt.tableName} ADD COLUMN ${columnStr};`;
    })
    .with({ type: "alter", action: "drop" }, (stmt) => {
      return `ALTER TABLE ${stmt.tableName} DROP COLUMN ${stmt.columnName};`;
    })
    .with({ type: "update" }, (stmt) => {
      return `UPDATE ${stmt.tableName} SET ${stmt.set
        .map((set) => `${set.column} = ${expression2String(set.value)}`)
        .join(", ")}${
        stmt.where ? ` WHERE ${condition2String(stmt.where)}` : ""
      };`;
    })
    .with({ type: "delete" }, (stmt) => {
      return `DELETE FROM ${stmt.tableName}${
        stmt.where ? ` WHERE ${condition2String(stmt.where)}` : ""
      };`;
    })
    .exhaustive();
};

const tableInfo2String = (tableInfo: SelectStatement["table"]): string => {
  if (!tableInfo) return "";
  return (
    " FROM " +
    match(tableInfo)
      .returnType<string>()
      .with({ type: "table-name" }, ({ name }) => name)
      .with({ type: "values" }, ({ values, tempTableName, columns }) => {
        const valuesStr = values
          .map((exprs) => `(${exprs.map(expression2String).join()})`)
          .join();
        return `(VALUES ${valuesStr}) AS ${tempTableName}(${columns.join()})`;
      })
      .exhaustive()
  );
};

const unionAll2String = (unionAll: SelectStatement["unionAll"]): string => {
  if (!unionAll || unionAll.length === 0) return "";
  return (
    " UNION ALL " +
    unionAll
      .map((row) => `SELECT ${row.map(expression2String).join(", ")}\n`)
      .join("UNION ALL\n")
  );
};

const condition2String = (where: Condition): string => {
  switch (where.type) {
    case "Comparison":
      return `${where.left.name} ${where.operator.value} ${expression2String(
        where.right
      )}`;
    case "In":
      return `${where.reference.name} ${
        where.isNot ? "NOT " : ""
      }IN (${where.exprs.map((expr) => expression2String(expr)).join(", ")})`;
    case "Between":
      return `${where.reference.name} ${
        where.isNot ? "NOT " : ""
      }BETWEEN ${expression2String(where.left)} AND ${expression2String(
        where.right
      )}`;
    case "Logic":
      return `(${condition2String(where.left)} ${where.key.toUpperCase()} ${
        where.isNot ? "NOT " : ""
      }${condition2String(where.right)})`;
    case "Is-Null":
      return `${where.reference.name} IS ${where.isNot ? "NOT" : ""} NULL`;
  }
};

const expression2String = (expr: Expression): string => {
  switch (expr.type) {
    case "Null":
      return "NULL";
    case "Boolean":
      return expr.value ? "TRUE" : "FALSE";
    case "Integer":
      return expr.value.toString();
    case "Float":
      return expr.value.toString();
    case "String":
      return `'${expr.value}'`;
    case "Reference":
      return expr.name;
    case "OperatorExpression":
      return `(${expression2String(expr.left)} ${
        expr.operator.value
      } ${expression2String(expr.right)})`;
    case "SubqueryExpression":
      return `(${sql2String(expr.stmt)})`;
    case "Avg":
    case "Count":
    case "Max":
    case "Min":
    case "Sum":
      return `${expr.type}(${expression2String(expr.expr)})`;
  }
};

const column2String = (col: Column): string => {
  const nullable = col.nullable ?? true ? "" : " NOT NULL";
  const primary = col.primary ? " PRIMARY KEY" : "";
  const defaultValue = col.default
    ? ` DEFAULT ${expression2String(col.default)}`
    : "";
  return `${col.name} ${col.datatype}${nullable}${primary}${defaultValue}`;
};

export interface CreateTableStatement {
  type: "create-table";
  name: string;
  columns: Column[];
}

export interface InsertStatement {
  type: "insert";
  tableName: string;
  columns?: string[];
  values: Expression[][];
}

export interface SelectStatement {
  type: "select";
  table?:
    | { type: "table-name"; name: string }
    | {
        type: "values";
        values: Expression[][];
        columns: string[];
        tempTableName: string;
      };
  columns:
    | "*"
    | {
        expr: Expression;
        alias?: string;
      }[];
  unionAll?: Expression[][];
  where?: Condition;
}

export interface DropColumnStatement {
  type: "alter";
  action: "drop";
  tableName: string;
  columnName: string;
}

export interface AddColumnStatement {
  type: "alter";
  action: "add";
  tableName: string;
  column: Column;
}

export type AlterStatement = DropColumnStatement | AddColumnStatement;

export interface DeleteStatement {
  type: "delete";
  tableName: string;
  where?: Condition;
}

export interface UpdateStatement {
  type: "update";
  tableName: string;
  set: { column: string; value: Expression }[];
  where?: Condition;
}

export interface Column {
  name: string;
  primary: boolean;
  datatype: DataType;
  nullable?: boolean;
  default?: Expression;
}

export type Expression =
  | Consts
  | Reference
  | OperatorExpression
  | SubqueryExpression
  | AggregateFunctionExpression;

export type Consts =
  | { type: "Null" }
  | { type: "Boolean"; value: boolean }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "String"; value: string };

export interface Reference {
  type: "Reference";
  name: string;
}

export interface OperatorExpression {
  type: "OperatorExpression";
  operator: Operator;
  left: Expression;
  right: Expression;
}

export interface SubqueryExpression {
  type: "SubqueryExpression";
  stmt: SelectStatement;
}

export interface AggregateFunctionExpression {
  type: "Avg" | "Count" | "Max" | "Min" | "Sum";
  expr: Expression;
}

export interface ComparisonCondition {
  type: "Comparison";
  isNot: boolean;
  operator: ComparisonOperator;
  left: Reference;
  right: Expression;
}

export interface InCondition {
  type: "In";
  isNot: boolean;
  reference: Reference;
  exprs: Expression[];
}

export interface BetweenCondition {
  type: "Between";
  isNot: boolean;
  reference: Reference;
  left: Expression;
  right: Expression;
}

export interface LogicCondition {
  type: "Logic";
  key: "and" | "or";
  isNot: boolean;
  left: Condition;
  right: Condition;
}

export interface AssertNullCondition {
  type: "Is-Null";
  isNot: boolean;
  reference: Reference;
}

export type SingleCondition =
  | ComparisonCondition
  | InCondition
  | BetweenCondition
  | AssertNullCondition;

export type Condition = SingleCondition | LogicCondition;
