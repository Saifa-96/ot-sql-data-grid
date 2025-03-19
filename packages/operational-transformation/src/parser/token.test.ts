import { describe, expect, test } from "@jest/globals";
import { Keyword } from "./keyword";
import { getTokenValue, hasValue, TokenType } from "./token";

describe("Test token utils", () => {
  test("hasValue", () => {
    expect(hasValue({ type: TokenType.Keyword, value: Keyword.True })).toBe(
      true
    );
    expect(hasValue({ type: TokenType.Ident, value: "test" })).toBe(true);
    expect(hasValue({ type: TokenType.String, value: "test" })).toBe(true);
    expect(hasValue({ type: TokenType.Number, value: "1" })).toBe(true);
    expect(hasValue({ type: TokenType.OpenParen })).toBe(false);
    expect(hasValue({ type: TokenType.CloseParen })).toBe(false);
    expect(hasValue({ type: TokenType.Comma })).toBe(false);
    expect(hasValue({ type: TokenType.Semicolon })).toBe(false);
    expect(hasValue({ type: TokenType.Asterisk })).toBe(false);
    expect(hasValue({ type: TokenType.Plus })).toBe(false);
    expect(hasValue({ type: TokenType.Minus })).toBe(false);
    expect(hasValue({ type: TokenType.Slash })).toBe(false);
  });

  test("getTokenValue", () => {
    expect(
      getTokenValue({ type: TokenType.Keyword, value: Keyword.True })
    ).toBe(Keyword.True);
    expect(getTokenValue({ type: TokenType.Ident, value: "test" })).toBe(
      "test"
    );
    expect(getTokenValue({ type: TokenType.String, value: "test" })).toBe(
      "test"
    );
    expect(getTokenValue({ type: TokenType.Number, value: "1" })).toBe("1");
    expect(getTokenValue({ type: TokenType.OpenParen })).toBe(null);
    expect(getTokenValue({ type: TokenType.CloseParen })).toBe(null);
    expect(getTokenValue({ type: TokenType.Comma })).toBe(null);
    expect(getTokenValue({ type: TokenType.Semicolon })).toBe(null);
    expect(getTokenValue({ type: TokenType.Asterisk })).toBe(null);
    expect(getTokenValue({ type: TokenType.Plus })).toBe(null);
    expect(getTokenValue({ type: TokenType.Minus })).toBe(null);
    expect(getTokenValue({ type: TokenType.Slash })).toBe(null);
  });
});
