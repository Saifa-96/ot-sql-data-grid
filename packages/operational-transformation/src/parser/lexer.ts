import { toKeyword } from "./keyword";
import PeekableIterator from "./peekable-iterator";
import { Operator, Token, TokenType } from "./token";

export class Lexer {
  private iter: PeekableIterator<string>;

  constructor(sqlText: string) {
    this.iter = new PeekableIterator(sqlText[Symbol.iterator]());
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
      const char = this.iter.next().value;
      if (isQuotation(char)) break;
      if (!char) throw new Error("Unexpected end of string");
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
      case "+":
        return { type: TokenType.Plus };
      case "-":
        return { type: TokenType.Minus };
      case "/":
        return { type: TokenType.Slash };
      case "=":
        return { type: TokenType.Operator, value: Operator.Equals };
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

const isQuotation = (str: string) => {
  return str === "'" || str === '"';
};
