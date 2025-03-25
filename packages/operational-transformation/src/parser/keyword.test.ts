import { describe, expect, test } from "@jest/globals";
import { Keyword, toKeyword } from "./keyword";

describe("Test keyword utils", () => {
  test("toKeyword - case insensitive", () => {
    expect(toKeyword("cReAtE")).toBe(Keyword.Create);
    expect(toKeyword("TABLE")).toBe(Keyword.Table);
    expect(toKeyword("INT")).toBe(Keyword.Int);
    expect(toKeyword("BOOLEAN")).toBe(Keyword.Boolean);
    expect(toKeyword("STRING")).toBe(Keyword.String);
    expect(toKeyword("FLOAT")).toBe(Keyword.Float);
    expect(toKeyword("SELECT")).toBe(Keyword.Select);
    expect(toKeyword("INSERT")).toBe(Keyword.Insert);
    expect(toKeyword("VALUES")).toBe(Keyword.Values);
    expect(toKeyword("TRUE")).toBe(Keyword.True);
    expect(toKeyword("FALSE")).toBe(Keyword.False);
    expect(toKeyword("DEFAULT")).toBe(Keyword.Default);
    expect(toKeyword("NOT")).toBe(Keyword.Not);
    expect(toKeyword("NULL")).toBe(Keyword.Null);
    expect(toKeyword("PRIMARY")).toBe(Keyword.Primary);
    expect(toKeyword("KEY")).toBe(Keyword.Key);
    expect(toKeyword("ALTER")).toBe(Keyword.Alter);
    expect(toKeyword("DROP")).toBe(Keyword.Drop);
    expect(toKeyword("ADD")).toBe(Keyword.Add);
    expect(toKeyword("UPDATE")).toBe(Keyword.Update);
    expect(toKeyword("SET")).toBe(Keyword.Set);
    expect(toKeyword("WHERE")).toBe(Keyword.Where);
    expect(toKeyword("DELETE")).toBe(Keyword.Delete);
    expect(toKeyword("IN")).toBe(Keyword.In);
    expect(toKeyword("COLUMN")).toBe(Keyword.Column);
    expect(toKeyword("BEGIN")).toBe(Keyword.Begin);
    expect(toKeyword("TRANSACTION")).toBe(Keyword.Transaction);
    expect(toKeyword("COMMIT")).toBe(Keyword.Commit);
  });
});
