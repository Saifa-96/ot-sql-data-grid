import { ComparisonOperator, Operator } from "./token";

export enum DataType {
  Boolean,
  Integer,
  Float,
  String,
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
  tableName: string;
}

export interface DropColumnStatement {
  action: "drop";
  tableName: string;
  columnName: string;
}

export interface AddColumnStatement {
  action: "add";
  tableName: string;
  column: Column;
}

export type AlterStatement = {
  type: "alter";
} & (DropColumnStatement | AddColumnStatement);

export interface DeleteStatement {
  type: "delete";
  tableName: string;
  columnName: string;
  values: Expression[];
}

export interface UpdateStatement {
  type: "update";
  tableName: string;
  set: { column: string; value: Expression }[];
  where?: Expression;
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
  | ComparisonExpression
  | ConcatExpression;

export type Consts =
  | { type: "Null" }
  | { type: "Boolean"; value: boolean }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "String"; value: string };

export type ConcatExpression = {
  type: "ConcatExpression";
  left: Expression;
  right: Expression;
};

export interface ComparisonExpression {
  type: "ComparisonExpression";
  operator: Operator;
  left: Expression;
  right: Expression;
}

export interface Reference {
  type: "Reference";
  name: string;
}

export interface ComparisonCondition {
  type: "Comparison";
  isNot: boolean;
  operator: ComparisonOperator;
  left: unknown;
  right: unknown;
}

export interface InCondition {
  type: "In";
  isNot: boolean;
  reference: Reference;
  values: Expression[];
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
  isNot: boolean;
  key: "and" | "or";
  left: Condition;
  right: Condition;
}

export interface AssertNullCondition {
  type: "Is-Null";
  isNot: boolean;
  reference: Reference;
}

export type Condition =
  | ComparisonCondition
  | InCondition
  | BetweenCondition
  | LogicCondition
  | AssertNullCondition;
