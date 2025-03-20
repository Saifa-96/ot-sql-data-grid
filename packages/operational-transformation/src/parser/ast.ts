import { Operator } from "./token";

export enum DataType {
  Boolean,
  Integer,
  Float,
  String,
}

export type Statement =
  | CreateTableStatement
  | InsertStatement
  | SelectStatement
  | AlterStatement
  | UpdateStatement
  | DeleteStatement;

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
  where: Expression;
}

export interface Column {
  name: string;
  primary: boolean;
  datatype: DataType;
  nullable?: boolean;
  default?: Expression;
}

export type Expression = Consts | BinaryExpression | ColumnReference;

export type Consts =
  | { type: "Null" }
  | { type: "Boolean"; value: boolean }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "String"; value: string };

export interface BinaryExpression {
  type: "BinaryExpression";
  operator: Operator;
  left: ColumnReference;
  right: Expression;
}

export interface ColumnReference {
  type: "ColumnReference";
  name: string;
}
