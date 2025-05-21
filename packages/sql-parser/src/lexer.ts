import { toBuiltInFunction } from "./function";
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

  private scanLineComment(): Token {
    let value = "";
    while (true) {
      const char = this.iter.next().value;
      if (!char || /[\r\n]/.test(char)) break;
      value += char;
    }
    return {
      type: TokenType.SingleLineComment,
      value: value.trim(),
    };
  }

  private scanMultiLineComment(): Token {
    let value = "";
    while (true) {
      const char = this.iter.next().value;
      if (!char) throw new Error("Unexpected end of multi-line comment");
      if (char === "*" && this.nextIf("/")) {
        break;
      }
      value += char;
    }
    return {
      type: TokenType.MultiLineComment,
      value: value.trim(),
    };
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
    const builtinFunc = toBuiltInFunction(value);
    if (builtinFunc && this.iter.peek().value === "(") {
      return {
        type: TokenType.BuiltInFunction,
        value: builtinFunc,
      };
    }

    const keyword = toKeyword(value);
    return keyword === null
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
      case ".":
        return { type: TokenType.Dot };
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
        const symbol = this.scanSymbol();
        if (symbol.type === TokenType.Minus && this.nextIf("-")) {
          yield this.scanLineComment();
        } else if (symbol.type === TokenType.Slash && this.nextIf("*")) {
          yield this.scanMultiLineComment();
        } else {
          yield symbol;
        }
      }
    }
  }
}

const isQuotation = (str: string) => str === "'";
