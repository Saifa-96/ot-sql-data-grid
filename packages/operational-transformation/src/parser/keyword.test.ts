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
  });
});
