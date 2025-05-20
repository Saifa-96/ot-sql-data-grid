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

export interface LimitClause {
  expr: Expression;
  offset?: Expression;
}

export interface WhereClause {
  not: boolean;
  expr: Expression;
}

export interface OrderByClause {
  expr: Expression;
  order?: "asc" | "desc";
}

export type Dataset =
  | {
      type: "table-name";
      name: string;
      alias?: string;
    }
  | {
      type: "subquery";
      stmt: SelectStatement;
      alias?: string;
    };

export type JoinCondition =
  | {
      type: "natural";
    }
  | {
      type: "on";
      expr: Expression;
    }
  | {
      type: "using";
      columns: string[];
    };
export type JoinClause = (
  | {
      outer: boolean;
      type: "left" | "right" | "full";
      table: Dataset;
      condition: JoinCondition;
    }
  | {
      type: "inner";
      table: Dataset;
      condition: JoinCondition;
    }
  | {
      type: "cross";
      table: Dataset;
    }
)[];

export interface SelectStatement {
  type: "select";
  distinct?: boolean;
  columns:
    | "*"
    | {
        expr: Expression;
        alias?: string;
      }[];
  unionAll?: Expression[][];
  from?: Dataset[];
  join?: JoinClause;
  where?: WhereClause;
  groupBy?: Expression[];
  having?: Expression;
  orderBy?: OrderByClause[];
  limit?: LimitClause;
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
  where?: WhereClause;
}

export interface UpdateStatement {
  type: "update";
  tableName: string;
  set: { column: string; value: Expression }[];
  where?: WhereClause;
}

export interface Column {
  name: string;
  primary: boolean;
  datatype: DataType;
  nullable?: boolean;
  default?: Consts;
}

export interface Case {
  type: "Case";
  cases: { when: Expression; then: Expression }[];
  else?: Expression;
}

export interface Not {
  type: "Not";
  expr: Expression;
}

export type Expression = (
  | Consts
  | Reference
  | Binary
  | Subquery
  | AggregateFunc
  | ScalarFunc
  | Case
  | In
  | Between
  | Logic
  | Is
  | Like
  | Glob
  | Not
) & {
  priority?: true;
};

export type Consts =
  | { type: "Null" }
  | { type: "Current_Date" }
  | { type: "Current_Time" }
  | { type: "Current_Timestamp" }
  | { type: "Asterisk" }
  | { type: "Boolean"; value: boolean }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "String"; value: string };

export interface Reference {
  type: "Reference";
  name: string;
  table?: string;
}

export interface Binary {
  type: "Binary";
  operator: Operator;
  left: Expression;
  right: Expression;
}

export interface Subquery {
  type: "Subquery";
  stmt: SelectStatement;
}

export interface CommonAggregateFunc {
  type: "Avg" | "Count" | "Max" | "Min" | "Sum" | "Total";
  expr: Expression;
  distinct?: boolean;
}

export interface GroupConcatAggregateFunc {
  type: "GroupConcat";
  expr: Expression;
  separator?: Expression;
  orderBy?: OrderByClause[];
}

export type AggregateFunc = CommonAggregateFunc | GroupConcatAggregateFunc;

export type ScalarFunc =
  | {
      type: "Cast";
      expr: Expression;
      as: DataType;
    }
  | {
      type: "Length" | "Upper" | "Lower";
      expr: Expression;
    }
  | {
      type: "Trim" | "LTrim" | "RTrim";
      expr: Expression;
      chars?: Expression;
    }
  | {
      type: "Substr";
      expr: Expression;
      start: Expression;
      length?: Expression;
    }
  | {
      type: "Replace";
      expr: Expression;
      search: Expression;
      replace: Expression;
    }
  | {
      type: "Date" | "Time" | "Datetime" | "JulianDay" | "UnixEpoch";
      timeValue: Expression;
      modifiers?: string[];
    }
  | {
      type: "Strftime";
      format: string;
      timeValue: Expression;
      modifiers?: string[];
    }
  | {
      type: "TimeDiff";
      timeValue1: Expression;
      timeValue2: Expression;
    }
  | {
      type: "Abs" | 'Ceil';
      expr: Expression;
    };

export interface In {
  type: "In";
  not?: boolean;
  target: Expression;
  values: Expression[];
}

export interface Between {
  type: "Between";
  not?: boolean;
  target: Expression;
  lowerBound: Expression;
  upperBound: Expression;
}

export interface Logic {
  type: "Logic";
  key: "and" | "or";
  not?: boolean;
  left: Expression;
  right: Expression;
}

export interface Is {
  type: "Is";
  not?: boolean;
  target: Expression;
  value: Expression;
}

export interface Like {
  type: "Like";
  not?: boolean;
  target: Expression;
  pattern: Expression;
  escape?: Expression;
}

export interface Glob {
  type: "Glob";
  not?: boolean;
  target: Expression;
  pattern: Expression;
}
