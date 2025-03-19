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
    .otherwise(() => null);
};
