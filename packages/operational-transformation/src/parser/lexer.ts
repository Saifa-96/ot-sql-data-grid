import { toAggregateFunctionName } from "./aggregate-function";
import { toKeyword } from "./keyword";
import PeekableIterator from "./peekable-iterator";
import { Token, TokenType } from "./token";

export class Lexer {
  private iter: PeekableIterator<string>;

  constructor(sqlText: string) {
    this.iter = new PeekableIterator(sqlText[Symbol.iterator]());
  }

  private nextIf(c: string): boolean {
    const char = this.iter.peek().value;
    const result = char === c;
    if (result) {
      this.iter.next().value;
    }
    return result;
  }

  private expectChar(char: string, msg: string): void {
    if (this.iter.next().value !== char) {
      throw new Error(msg);
    }
  }

  private eraseWhitespace(): void {
    while (/\s/.test(this.iter.peek().value)) {
      this.iter.next();
    }
  }

  private scanString(): Token {
    const char = this.iter.next();
    if (char.value !== '"' && char.value !== "'") {
      throw new Error("Unexpected character");
    }
    let value = "";
    while (true) {
      let char = this.iter.next().value;
      if (!char) throw new Error("Unexpected end of string");

      if (isQuotation(char)) {
        const nextChar = this.iter.peek().value;
        if (isQuotation(nextChar)) {
          char = char + this.iter.next().value;  
        } else {
          break;
        }
      }
      value += char;
    }
    return { type: TokenType.String, value };
  }

  private scanNumber(): Token {
    let value = "";
    while (/\d/.test(this.iter.peek().value)) {
      value += this.iter.next().value;
    }
    if (this.iter.peek().value === ".") {
      value += this.iter.next().value;
      while (/\d/.test(this.iter.peek().value)) {
        value += this.iter.next().value;
      }
    }
    return { type: TokenType.Number, value };
  }

  private scanIdent(): Token {
    let value = "";
    while (/\w/.test(this.iter.peek().value)) {
      value += this.iter.next().value;
    }
    const aggregateFuncName = toAggregateFunctionName(value);
    const keyword = toKeyword(value);
    return aggregateFuncName
      ? {
          type: TokenType.AggregateFunction,
          value: aggregateFuncName,
        }
      : keyword === null
      ? { type: TokenType.Ident, value }
      : { type: TokenType.Keyword, value: keyword };
  }

  private scanSymbol(): Token {
    const char = this.iter.next().value;
    switch (char) {
      case "*":
        return { type: TokenType.Asterisk };
      case "(":
        return { type: TokenType.OpenParen };
      case ")":
        return { type: TokenType.CloseParen };
      case ",":
        return { type: TokenType.Comma };
      case ";":
        return { type: TokenType.Semicolon };
      case "+":
        return { type: TokenType.Plus };
      case "-":
        return { type: TokenType.Minus };
      case "/":
        return { type: TokenType.Slash };
      case "=":
        return { type: TokenType.Equals };
      case ">":
        return this.nextIf("=")
          ? { type: TokenType.GreaterThanOrEqual }
          : { type: TokenType.GreaterThan };
      case "<":
        return this.nextIf("=")
          ? { type: TokenType.LessThanOrEqual }
          : this.nextIf(">")
          ? { type: TokenType.NotEquals }
          : { type: TokenType.LessThan };
      case "!":
        this.expectChar(
          "=",
          `[Lexer] Unexpected character ${char} while executing scanSymbol`
        );
        return { type: TokenType.NotEquals };
      case "|":
        this.expectChar(
          "|",
          `[Lexer] Unexpected character ${char} while executing scanSymbol`
        );
        return { type: TokenType.StringConcatenation };
      default:
        throw new Error(
          `[Lexer] Unexpected character ${char} while executing scanSymbol`
        );
    }
  }

  public *scan(): IterableIterator<Token> {
    while (true) {
      this.eraseWhitespace();
      const char = this.iter.peek().value;
      if (!char) break;
      if (isQuotation(char)) {
        yield this.scanString();
      } else if (/\d/.test(char)) {
        yield this.scanNumber();
      } else if (/\w/.test(char)) {
        yield this.scanIdent();
      } else {
        yield this.scanSymbol();
      }
    }
  }
}

const isQuotation = (str: string) => str === "'";
