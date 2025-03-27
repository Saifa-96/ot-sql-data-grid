import { Operator } from "./token";

export enum DataType {
  Boolean,
  Integer,
  Float,
  String,
}

export interface Transaction {
  type: 'transaction';
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
  | BinaryExpression
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

export interface BinaryExpression {
  type: "BinaryExpression";
  operator: Operator;
  left: Expression;
  right: Expression;
}

export interface Reference {
  type: "Reference";
  name: string;
}
