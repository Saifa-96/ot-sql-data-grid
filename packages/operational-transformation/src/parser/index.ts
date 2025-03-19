import { equals } from "ramda";
import { match, P } from "ts-pattern";
import {
  Column,
  CreateTableStatement,
  DataType,
  Expression,
  InsertStatement,
  SelectStatement,
  Statement,
} from "./ast";
import { Keyword } from "./keyword";
import { Lexer } from "./lexer";
import PeekableIterator from "./peekable-iterator";
import { getTokenValue, hasValue, Token, TokenType } from "./token";

export class Parser {
  private lexer: PeekableIterator<Token>;

  constructor(input: string) {
    const iter = new Lexer(input).scan();
    this.lexer = new PeekableIterator(iter);
  }

  private nextToken() {
    const result = this.lexer.next();
    if (result.done) {
      throw new Error("Unexpected SQL text.");
    } else {
      return result.value;
    }
  }

  private peekToken() {
    const result = this.lexer.peek();
    if (result.done) {
      throw new Error("Unexpected SQL text.");
    } else {
      return result.value;
    }
  }

  private expectToken(token: Token): void {
    const curToken = this.nextToken();
    if (!equals(curToken, token)) {
      throw new Error(
        `Expected token ${TokenType[token.type]}${
          hasValue(token) ? ` with value ${token.value}` : ""
        }, but got ${
          curToken ? TokenType[curToken.type] : "EOF"
        } with value ${getTokenValue(curToken)}`
      );
    }
  }

  private parseIdent(): string {
    const token = this.nextToken();
    return match(token)
      .returnType<string>()
      .with({ type: TokenType.Ident, value: P.select() }, (v) => v as string)
      .otherwise(() => {
        throw new Error(
          `Expected identifier, but got ${
            token ? TokenType[token.type] : "EOF"
          } with value ${getTokenValue(token)}`
        );
      });
  }

  private parseExpression(): Expression {
    const token = this.nextToken();
    switch (token.type) {
      case TokenType.Number:
        const numValue = token.value;
        return numValue.includes(".")
          ? { type: "Float", value: parseFloat(numValue) }
          : { type: "Integer", value: parseInt(numValue, 10) };
      case TokenType.String:
        const strValue = token.value;
        return { type: "String", value: strValue };
      case TokenType.Keyword:
        switch (token.value) {
          case Keyword.True:
            this.nextToken();
            return { type: "Boolean", value: true };
          case Keyword.False:
            this.nextToken();
            return { type: "Boolean", value: false };
          case Keyword.Null:
            this.nextToken();
            return { type: "Null" };
          default:
            throw new Error(`Unexpected keyword ${token.value}`);
        }
      default:
        throw new Error(`Unexpected token ${TokenType[token.type]}`);
    }
  }

  private parseColumn(): Column {
    const name = this.parseIdent();
    const datatypeToken = this.nextToken();
    const datatype = match(datatypeToken)
      .with(
        { value: P.union(Keyword.Int, Keyword.Integer) },
        () => DataType.Integer
      )
      .with(
        { value: P.union(Keyword.Bool, Keyword.Boolean) },
        () => DataType.Boolean
      )
      .with(
        { value: P.union(Keyword.Float, Keyword.Double) },
        () => DataType.Float
      )
      .with(
        { value: P.union(Keyword.String, Keyword.Text, Keyword.Varchar) },
        () => DataType.String
      )
      .otherwise((token) => {
        throw new Error(`Unexpected token ${token.type}`);
      });

    let nullable: boolean | undefined;
    let defaultValue: Expression | undefined;
    let primary: boolean = false;

    let token = this.peekToken();
    while (token.type === TokenType.Keyword) {
      switch (token.value) {
        case Keyword.Primary:
          this.expectToken({ type: TokenType.Keyword, value: Keyword.Primary });
          this.expectToken({ type: TokenType.Keyword, value: Keyword.Key });
          primary = true;
          break;
        case Keyword.Null:
          this.expectToken({ type: TokenType.Keyword, value: Keyword.Null });
          nullable = true;
          break;
        case Keyword.Not:
          this.expectToken({ type: TokenType.Keyword, value: Keyword.Not });
          this.expectToken({ type: TokenType.Keyword, value: Keyword.Null });
          nullable = false;
          break;
        case Keyword.Default:
          this.expectToken({ type: TokenType.Keyword, value: Keyword.Default });
          defaultValue = this.parseExpression();
          break;
        default:
          throw new Error(`Unexpected keyword ${token.value}`);
      }
      token = this.peekToken();
    }
    return { name, datatype, nullable, default: defaultValue, primary };
  }

  private parseCreateTable(): CreateTableStatement {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Create });
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Table });
    const name = this.parseIdent();
    this.expectToken({ type: TokenType.OpenParen });

    const columns: Column[] = [];
    while (true) {
      columns.push(this.parseColumn());
      const token = this.peekToken();
      if (token.type === TokenType.CloseParen) {
        break;
      } else if (token.type === TokenType.Comma) {
        this.nextToken();
        continue;
      } else {
        throw new Error(`Unexpected token ${TokenType[token.type]}`);
      }
    }

    this.expectToken({ type: TokenType.CloseParen });
    return { type: "CreateTable", name, columns };
  }

  private parseInsert(): InsertStatement {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Insert });
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Into });
    const tableName = this.parseIdent();

    let columns: string[] | undefined;
    let token = this.peekToken();
    if (token.type === TokenType.OpenParen) {
      token = this.nextToken();
      columns = [];
      while (this.peekToken().type !== TokenType.CloseParen) {
        columns.push(this.parseIdent());
        if (this.peekToken().type === TokenType.Comma) {
          token = this.nextToken();
        }
      }
      this.expectToken({ type: TokenType.CloseParen });
    }
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Values });

    const values: Expression[][] = [];
    while (true) {
      this.expectToken({ type: TokenType.OpenParen });
      const exprs: Expression[] = [];
      while (true) {
        exprs.push(this.parseExpression());
        const token = this.nextToken();
        if (token.type === TokenType.CloseParen) {
          break;
        } else if (token.type === TokenType.Comma) {
          continue;
        } else {
          throw new Error(`Unexpected token ${TokenType[token.type]}`);
        }
      }

      values.push(exprs);
      if (this.nextToken().type !== TokenType.Comma) {
        break;
      }
    }

    return { type: "Insert", tableName, columns, values };
  }

  private parseSelect(): SelectStatement {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Select });
    this.expectToken({ type: TokenType.Asterisk });
    this.expectToken({ type: TokenType.Keyword, value: Keyword.From });
    const tableName = this.parseIdent();
    return { type: "Select", tableName };
  }

  public parse(): ParsedResult {
    try {
      return match(this.peekToken())
        .returnType<ParsedResult>()
        .with({ type: TokenType.Keyword, value: Keyword.Create }, () => ({
          type: "success",
          stmt: this.parseCreateTable(),
        }))
        .with({ type: TokenType.Keyword, value: Keyword.Insert }, () => ({
          type: "success",
          stmt: this.parseInsert(),
        }))
        .with({ type: TokenType.Keyword, value: Keyword.Select }, () => ({
          type: "success",
          stmt: this.parseSelect(),
        }))
        .otherwise((token) => ({
          type: "err",
          err: new Error(`Unexpected token ${getTokenValue(token)}`),
        }));
    } catch (err) {
      return { type: "err", err: err as Error };
    }
  }
}

type ParsedResult =
  | { type: "success"; stmt: Statement }
  | { type: "err"; err: Error };
