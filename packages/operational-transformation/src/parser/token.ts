import { Keyword } from "./keyword";

export enum TokenType {
  Keyword = "Keyword",
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
  Equals = "Equals",
  StringConcatenation = "StringConcatenation",
  GreaterThan = "GreaterThan",
  GreaterThanOrEqual = "GreaterThanOrEqual",
  LessThan = "LessThan",
  LessThanOrEqual = "LessThanOrEqual",
}

export type Operator =
  | { type: TokenType.Asterisk }
  | { type: TokenType.Plus }
  | { type: TokenType.Minus }
  | { type: TokenType.Slash }
  | { type: TokenType.Equals }
  | { type: TokenType.StringConcatenation }
  | { type: TokenType.GreaterThan }
  | { type: TokenType.GreaterThanOrEqual }
  | { type: TokenType.LessThan }
  | { type: TokenType.LessThanOrEqual };

export type Token =
  | { type: TokenType.Keyword; value: Keyword }
  | { type: TokenType.Ident; value: string }
  | { type: TokenType.String; value: string }
  | { type: TokenType.Number; value: string }
  | { type: TokenType.OpenParen }
  | { type: TokenType.CloseParen }
  | { type: TokenType.Comma }
  | { type: TokenType.Semicolon }
  | Operator;

export const isOperator = (token: Token): token is Operator => {
  switch (token.type) {
    case TokenType.Asterisk:
    case TokenType.Plus:
    case TokenType.Minus:
    case TokenType.Slash:
    case TokenType.Equals:
    case TokenType.StringConcatenation:
    case TokenType.GreaterThan:
    case TokenType.LessThan:
    case TokenType.GreaterThanOrEqual:
    case TokenType.LessThanOrEqual:
      return true;
    default:
      return false;
  }
};

export const hasValue = (token: Token) => {
  return (
    token.type === TokenType.Keyword ||
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
