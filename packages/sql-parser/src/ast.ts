import { match, P } from "ts-pattern";

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
  Datetime = "DATETIME",
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
    .with({ type: "insert", values: P.nonNullable }, (stmt) => {
      return `INSERT INTO ${stmt.tableName} (${
        stmt.columns ? stmt.columns.join(", ") : "*"
      }) VALUES ${stmt.values
        .map((row) => `(${row.map(expression2String).join(", ")})`)
        .join(", ")};`;
    })
    .with({ type: "insert", select: P.nonNullable }, (stmt) => {
      return `INSERT INTO ${stmt.tableName} (${
        stmt.columns ? stmt.columns.join(", ") : "*"
      }) ${selectStm2String(stmt.select)};`;
    })
    .with({ type: "select" }, (stmt) => {
      return selectStm2String(stmt) + ";";
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

const selectStm2String = (selectStmt: SelectStatement): string => {
  const columnsStr = Array.isArray(selectStmt.columns)
    ? selectStmt.columns
        .map(
          (col) =>
            `${expression2String(col.expr)}${
              col.alias ? ` AS ${col.alias}` : ""
            }`
        )
        .join(", ")
    : selectStmt.columns;
  const whereClauseStr = selectStmt.where
    ? ` WHERE ${condition2String(selectStmt.where)}`
    : "";
  const tableInfoStr = tableInfo2String(selectStmt.table);
  const unionAllStr = unionAll2String(selectStmt.unionAll);
  return `SELECT ${columnsStr}${unionAllStr}${tableInfoStr}${whereClauseStr}`;
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
    case "Expression":
      return `${where.isNot ? "NOT " : ""}${expression2String(where.expr)}`;
    case "In":
      return `${expression2String(where.target)} ${
        where.isNot ? "NOT " : ""
      }IN (${where.values.map((expr) => expression2String(expr)).join(", ")})`;
    case "Between":
      return `${expression2String(where.target)} ${
        where.isNot ? "NOT " : ""
      }BETWEEN ${expression2String(where.lowerBound)} AND ${expression2String(
        where.upperBound
      )}`;
    case "Logic":
      return `(${condition2String(where.left)} ${where.key.toUpperCase()} ${
        where.isNot ? "NOT " : ""
      }${condition2String(where.right)})`;
    case "Is":
      return `${expression2String(where.target)} IS ${
        where.isNot ? "NOT" : ""
      } ${expression2String(where.value)}`;
  }
};

const expression2String = (expr: Expression): string => {
  switch (expr.type) {
    case "Null":
      return "NULL";
    case "Current_Date":
      return "CURRENT_DATE";
    case "Current_Time":
      return "CURRENT_TIME";
    case "Current_Timestamp":
      return "CURRENT_TIMESTAMP";
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
      return `(${selectStm2String(expr.stmt)})`;
    case "Avg":
    case "Count":
    case "Max":
    case "Min":
    case "Sum":
      return `${expr.type}(${expression2String(expr.expr)})`;
    case "Cast":
      return `CAST(${expression2String(expr.expr)} AS ${expr.as})`;
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
  values?: Expression[][];
  select?: SelectStatement;
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
  default?: Consts;
}

export type Expression =
  | Consts
  | Reference
  | OperatorExpression
  | SubqueryExpression
  | AggregateFunctionExpression;

export type Consts =
  | { type: "Null" }
  | { type: "Current_Date" }
  | { type: "Current_Time" }
  | { type: "Current_Timestamp" }
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

export interface CommonAggregateFunctionExpression {
  type: "Avg" | "Count" | "Max" | "Min" | "Sum";
  expr: Expression;
}

export interface CastAggregateFunctionExpression {
  type: "Cast";
  expr: Expression;
  as: DataType;
}

export type AggregateFunctionExpression =
  | CommonAggregateFunctionExpression
  | CastAggregateFunctionExpression;

export interface ExpressionCondition {
  type: "Expression";
  isNot?: boolean;
  expr: Expression;
}

export interface InCondition {
  type: "In";
  isNot?: boolean;
  target: Expression;
  values: Expression[];
}

export interface BetweenCondition {
  type: "Between";
  isNot?: boolean;
  target: Expression;
  lowerBound: Expression;
  upperBound: Expression;
}

export interface LogicCondition {
  type: "Logic";
  key: "and" | "or";
  isNot: boolean;
  left: Condition;
  right: Condition;
}

// export interface AssertNullCondition {
//   type: "Is-Null";
//   isNot: boolean;
//   reference: Reference;
// }
export interface IsCondition {
  type: "Is";
  isNot: boolean;
  target: Expression;
  value: Expression;
}

export type SingleCondition =
  | ExpressionCondition
  | InCondition
  | BetweenCondition
  | IsCondition;

export type Condition = SingleCondition | LogicCondition;
