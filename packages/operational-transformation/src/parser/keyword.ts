import { match } from "ts-pattern";

export enum Keyword {
  Create = "CREATE",
  Table = "TABLE",
  Int = "INT",
  Integer = "INTEGER",
  Boolean = "BOOLEAN",
  Bool = "BOOL",
  String = "STRING",
  Text = "TEXT",
  Varchar = "VARCHAR",
  Float = "FLOAT",
  Double = "DOUBLE",
  Select = "SELECT",
  From = "FROM",
  Insert = "INSERT",
  Into = "INTO",
  Values = "VALUES",
  True = "TRUE",
  False = "FALSE",
  Default = "DEFAULT",
  Not = "NOT",
  Null = "NULL",
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
    .otherwise(() => null);
};
