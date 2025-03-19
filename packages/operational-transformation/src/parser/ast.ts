export enum DataType {
  Boolean,
  Integer,
  Float,
  String,
}

export type Statement =
  | CreateTableStatement
  | InsertStatement
  | SelectStatement;

export interface CreateTableStatement {
  type: "CreateTable";
  name: string;
  columns: Column[];
}

export interface InsertStatement {
  type: "Insert";
  tableName: string;
  columns?: string[];
  values: Expression[][];
}

export interface SelectStatement {
  type: "Select";
  tableName: string;
}

export interface Column {
  name: string;
  primary: boolean;
  datatype: DataType;
  nullable?: boolean;
  default?: Expression;
}

export type Expression = Consts;

export type Consts =
  | { type: "Null" }
  | { type: "Boolean"; value: boolean }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "String"; value: string };
