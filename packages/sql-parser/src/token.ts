import { AggregateFunction, ScalarFunction } from "./function";
import { Keyword } from "./keyword";

export enum TokenType {
  ScalarFunction = "ScalarFunction",
  AggregateFunction = "AggregateFunction",
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
  NotEquals = "NotEquals",
  StringConcatenation = "StringConcatenation",
  GreaterThan = "GreaterThan",
  GreaterThanOrEqual = "GreaterThanOrEqual",
  LessThan = "LessThan",
  LessThanOrEqual = "LessThanOrEqual",
  SingleLineComment = "SingleLineComment",
  MultiLineComment = "MultiLineComment",
}

export type ComparisonOperatorToken =
  | { type: TokenType.Equals }
  | { type: TokenType.NotEquals }
  | { type: TokenType.GreaterThan }
  | { type: TokenType.GreaterThanOrEqual }
  | { type: TokenType.LessThan }
  | { type: TokenType.LessThanOrEqual };

export type ArithmeticOperatorToken =
  | { type: TokenType.Asterisk }
  | { type: TokenType.Plus }
  | { type: TokenType.Minus }
  | { type: TokenType.Slash };

export type OperatorToken =
  | ComparisonOperatorToken
  | ArithmeticOperatorToken
  | { type: TokenType.StringConcatenation };

export type Token =
  | { type: TokenType.AggregateFunction; value: AggregateFunction }
  | { type: TokenType.ScalarFunction; value: ScalarFunction }
  | { type: TokenType.Keyword; value: Keyword }
  | { type: TokenType.Ident; value: string }
  | { type: TokenType.String; value: string }
  | { type: TokenType.Number; value: string }
  | { type: TokenType.OpenParen }
  | { type: TokenType.CloseParen }
  | { type: TokenType.Comma }
  | { type: TokenType.Semicolon }
  | { type: TokenType.SingleLineComment; value: string }
  | { type: TokenType.MultiLineComment; value: string }
  | OperatorToken;

export const isOperator = (token: Token): token is OperatorToken => {
  switch (token.type) {
    case TokenType.Asterisk:
    case TokenType.Plus:
    case TokenType.Minus:
    case TokenType.Slash:
    case TokenType.Equals:
    case TokenType.NotEquals:
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

export const isLogicKeyword = (token: Token) => {
  if (token.type !== TokenType.Keyword) {
    return false;
  }
  switch (token.value) {
    case Keyword.And:
    case Keyword.Or:
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
    token.type === TokenType.Number ||
    token.type === TokenType.AggregateFunction ||
    token.type === TokenType.ScalarFunction ||
    token.type === TokenType.SingleLineComment ||
    token.type === TokenType.MultiLineComment
  );
};

export const getTokenValue = (token: Token) => {
  if (!hasValue(token)) {
    return null;
  }
  return token.value;
};
