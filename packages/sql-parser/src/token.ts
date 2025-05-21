import { BuiltInFunction } from "./function";
import { Keyword } from "./keyword";

export enum TokenType {
  BuiltInFunction = "BuiltInFunction",
  Keyword = "Keyword",
  Ident = "Ident",
  String = "String",
  Number = "Number",
  OpenParen = "OpenParen",
  CloseParen = "CloseParen",
  Comma = "Comma",
  Semicolon = "Semicolon",
  Dot = "Dot",
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
  | { type: TokenType.BuiltInFunction; value: BuiltInFunction }
  | { type: TokenType.Keyword; value: Keyword }
  | { type: TokenType.Ident; value: string }
  | { type: TokenType.String; value: string }
  | { type: TokenType.Number; value: string }
  | { type: TokenType.OpenParen }
  | { type: TokenType.CloseParen }
  | { type: TokenType.Comma }
  | { type: TokenType.Dot }
  | { type: TokenType.Semicolon }
  | { type: TokenType.SingleLineComment; value: string }
  | { type: TokenType.MultiLineComment; value: string }
  | OperatorToken;
