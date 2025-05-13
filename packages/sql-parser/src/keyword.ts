import { match } from "ts-pattern";

export enum Keyword {
  // Data types
  Int = "INT",
  Integer = "INTEGER",
  Boolean = "BOOLEAN",
  Bool = "BOOL",
  String = "STRING",
  Text = "TEXT",
  Varchar = "VARCHAR",
  Float = "FLOAT",
  Double = "DOUBLE",
  DATETIME = "DATETIME",

  // Values
  True = "TRUE",
  False = "FALSE",
  Not = "NOT",
  Null = "NULL",
  Current_Date = "CURRENT_DATE",
  Current_Time = "CURRENT_TIME",
  Current_Timestamp = "CURRENT_TIMESTAMP",


  // SQL keywords
  Create = "CREATE",
  Table = "TABLE",
  Select = "SELECT",
  From = "FROM",
  Insert = "INSERT",
  Into = "INTO",
  Values = "VALUES",
  Default = "DEFAULT",
  Primary = "PRIMARY",
  Key = "KEY",
  Alter = "ALTER",
  Drop = "DROP",
  Add = "ADD",
  Update = "UPDATE",
  Set = "SET",
  Where = "WHERE",
  Delete = "DELETE",
  In = "IN",
  Column = "COLUMN",
  Begin = "BEGIN",
  Transaction = "TRANSACTION",
  Commit = "COMMIT",
  Between = "BETWEEN",
  And = "AND",
  Or = "OR",
  Is = "IS",
  As = "AS",
  Union = "UNION",
  All = "ALL",
  Order = "ORDER",
  By = "BY",
  Case = "CASE",
  When = "WHEN",
  Then = "THEN",
  Else = "ELSE",
  End = "END",
  Asc = "ASC",
  Desc = "DESC",
}

export const toKeyword = (word: string): Keyword | null => {
  return match(word.toUpperCase())
    .returnType<Keyword | null>()
    .with("CREATE", () => Keyword.Create)
    .with("TABLE", () => Keyword.Table)
    .with("INT", () => Keyword.Int)
    .with("INTEGER", () => Keyword.Integer)
    .with("BOOLEAN", () => Keyword.Boolean)
    .with("BOOL", () => Keyword.Bool)
    .with("STRING", () => Keyword.String)
    .with("TEXT", () => Keyword.Text)
    .with("VARCHAR", () => Keyword.Varchar)
    .with("FLOAT", () => Keyword.Float)
    .with("DOUBLE", () => Keyword.Double)
    .with("SELECT", () => Keyword.Select)
    .with("FROM", () => Keyword.From)
    .with("INSERT", () => Keyword.Insert)
    .with("INTO", () => Keyword.Into)
    .with("VALUES", () => Keyword.Values)
    .with("TRUE", () => Keyword.True)
    .with("FALSE", () => Keyword.False)
    .with("DEFAULT", () => Keyword.Default)
    .with("NOT", () => Keyword.Not)
    .with("NULL", () => Keyword.Null)
    .with("PRIMARY", () => Keyword.Primary)
    .with("KEY", () => Keyword.Key)
    .with("ALTER", () => Keyword.Alter)
    .with("DROP", () => Keyword.Drop)
    .with("ADD", () => Keyword.Add)
    .with("UPDATE", () => Keyword.Update)
    .with("SET", () => Keyword.Set)
    .with("WHERE", () => Keyword.Where)
    .with("DELETE", () => Keyword.Delete)
    .with("IN", () => Keyword.In)
    .with("COLUMN", () => Keyword.Column)
    .with("BEGIN", () => Keyword.Begin)
    .with("TRANSACTION", () => Keyword.Transaction)
    .with("COMMIT", () => Keyword.Commit)
    .with("BETWEEN", () => Keyword.Between)
    .with("AND", () => Keyword.And)
    .with("OR", () => Keyword.Or)
    .with("IS", () => Keyword.Is)
    .with("AS", () => Keyword.As)
    .with("UNION", () => Keyword.Union)
    .with("ALL", () => Keyword.All)
    .with("DATETIME", () => Keyword.DATETIME)
    .with("CURRENT_DATE", () => Keyword.Current_Date)
    .with("CURRENT_TIME", () => Keyword.Current_Time)
    .with("CURRENT_TIMESTAMP", () => Keyword.Current_Timestamp)
    .with("ORDER", () => Keyword.Order)
    .with("BY", () => Keyword.By)
    .with("CASE", () => Keyword.Case)
    .with("WHEN", () => Keyword.When)
    .with("THEN", () => Keyword.Then)
    .with("ELSE", () => Keyword.Else)
    .with("END", () => Keyword.End)
    .with("ASC", () => Keyword.Asc)
    .with("DESC", () => Keyword.Desc)
    .otherwise(() => null);
};
