import { Keyword } from "./keyword";

export enum Operator {
  Equals = "=",
  // GreaterThan = ">",
  // LessThan = "<",
  // GreaterThanOrEqual = ">=",
  // LessThanOrEqual = "<=",
  // NotEqual = "<>",
}


export enum TokenType {
  Keyword = "Keyword",
  Operator = "Operator",
  Ident = "Ident",
  String = "String",
  Number = "Number",
  OpenParen = "OpenParen",
  CloseParen = "CloseParen",
  Comma = "Comma",
  Semicolon = "Semicolon",
  Asterisk = "Asterisk",
  Plus = "Plus",
  Minus = "Minus",
  Slash = "Slash",
}

export type Token =
  | { type: TokenType.Keyword; value: Keyword }
  | { type: TokenType.Operator; value: Operator }
  | { type: TokenType.Ident; value: string }
  | { type: TokenType.String; value: string }
  | { type: TokenType.Number; value: string }
  | { type: TokenType.OpenParen }
  | { type: TokenType.CloseParen }
  | { type: TokenType.Comma }
  | { type: TokenType.Semicolon }
  | { type: TokenType.Asterisk }
  | { type: TokenType.Plus }
  | { type: TokenType.Minus }
  | { type: TokenType.Slash };

export const hasValue = (token: Token) => {
  return (
    token.type === TokenType.Keyword ||
    token.type === TokenType.Operator ||
    token.type === TokenType.Ident ||
    token.type === TokenType.String ||
    token.type === TokenType.Number
  );
};

export const getTokenValue = (token: Token) => {
  if (!hasValue(token)) {
    return null;
  }
  return token.value;
};
