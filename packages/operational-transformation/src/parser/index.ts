import { match, P } from "ts-pattern";
import {
  AlterStatement,
  BinaryExpression,
  Column,
  Consts,
  CreateTableStatement,
  DataType,
  DeleteStatement,
  Expression,
  InsertStatement,
  SelectStatement,
  Statement,
  UpdateStatement,
} from "./ast";
import { Keyword } from "./keyword";
import { Lexer } from "./lexer";
import PeekableIterator from "./peekable-iterator";
import { getTokenValue, hasValue, Operator, Token, TokenType } from "./token";
import { isEqual } from "lodash";

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
    if (!isEqual(curToken, token)) {
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
    let expr: Expression;
    const token = this.peekToken();
    if (token.type === TokenType.Ident) {
      expr = this.parseBinaryExpression();
    } else {
      expr = this.parseConsts();
    }
    return expr;
  }

  private parseConsts(): Consts {
    const token = this.nextToken();
    return match(token)
      .returnType<Consts>()
      .with({ type: TokenType.Number }, (token) => {
        const num = token.value;
        return num.includes(".")
          ? { type: "Float", value: parseFloat(num) }
          : { type: "Integer", value: parseInt(num, 10) };
      })
      .with({ type: TokenType.String }, (token) => {
        return { type: "String", value: token.value };
      })
      .with({ type: TokenType.Keyword, value: Keyword.True }, () => {
        return { type: "Boolean", value: true };
      })
      .with({ type: TokenType.Keyword, value: Keyword.False }, () => {
        return { type: "Boolean", value: false };
      })
      .with({ type: TokenType.Keyword, value: Keyword.Null }, () => {
        return { type: "Null" };
      })
      .otherwise(() => {
        throw new Error(
          `[Parse Consts] Unexpected token ${TokenType[token.type]}`
        );
      });
  }

  private parseBinaryExpression(): BinaryExpression {
    const left = this.parseIdent();
    const op = this.nextToken();
    if (op.type !== TokenType.Operator) {
      throw new Error(`Unexpected token ${TokenType[op.type]}`);
    }
    const right = this.parseExpression();
    return {
      type: "BinaryExpression",
      operator: op.value,
      left: { type: "ColumnReference", name: left },
      right,
    };
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
    return { type: "create-table", name, columns };
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

    return { type: "insert", tableName, columns, values };
  }

  private parseSelect(): SelectStatement {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Select });
    this.expectToken({ type: TokenType.Asterisk });
    this.expectToken({ type: TokenType.Keyword, value: Keyword.From });
    const tableName = this.parseIdent();
    return { type: "select", tableName };
  }

  private parseAlter(): AlterStatement {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Alter });
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Table });
    const tableName = this.parseIdent();
    const actionToken = this.nextToken();
    const action = match(actionToken)
      .returnType<"add" | "drop">()
      .with({ type: TokenType.Keyword, value: Keyword.Add }, () => "add")
      .with({ type: TokenType.Keyword, value: Keyword.Drop }, () => "drop")
      .otherwise(() => {
        throw new Error(
          `[Alter Stmt] Unexpected token ${TokenType[actionToken.type]}`
        );
      });
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Column });
    if (action === "drop") {
      return {
        type: "alter",
        tableName,
        columnName: this.parseIdent(),
        action: "drop",
      };
    }
    return { type: "alter", tableName, column: this.parseColumn(), action };
  }

  private parseUpdate(): UpdateStatement {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Update });
    const tableName = this.parseIdent();
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Set });

    const setClause: { column: string; value: Expression }[] = [];
    do {
      const column = this.parseIdent();
      this.expectToken({ type: TokenType.Operator, value: Operator.Equals });
      const value = this.parseExpression();
      setClause.push({ column, value });
      const token = this.peekToken();
      if (token.type === TokenType.Keyword && token.value === Keyword.Where) {
        break;
      }
    } while (this.nextToken().type === TokenType.Comma);
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Where });
    // TODO supports `and` and `or` in where clause
    const whereClause = this.parseExpression();
    return {
      type: "update",
      tableName,
      set: setClause,
      where: whereClause,
    };
  }

  private parseDelete(): DeleteStatement {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Delete });
    this.expectToken({ type: TokenType.Keyword, value: Keyword.From });
    const tableName = this.parseIdent();
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Where });
    const columnName = this.parseIdent();
    this.expectToken({ type: TokenType.Keyword, value: Keyword.In });
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
        throw new Error(
          `[Delete Stmt] Unexpected token ${TokenType[token.type]}`
        );
      }
    }

    return { type: "delete", tableName, columnName, values: exprs };
  }

  public parse(): ParsedResult {
    try {
      const stmt = match(this.peekToken())
        .returnType<Statement>()
        .with(keywordToken(Keyword.Create), () => this.parseCreateTable())
        .with(keywordToken(Keyword.Insert), () => this.parseInsert())
        .with(keywordToken(Keyword.Select), () => this.parseSelect())
        .with(keywordToken(Keyword.Alter), () => this.parseAlter())
        .with(keywordToken(Keyword.Update), () => this.parseUpdate())
        .with(keywordToken(Keyword.Delete), () => this.parseDelete())
        .otherwise((token) => {
          throw new Error(`Unexpected token ${TokenType[token.type]}`);
        });
      return { type: "success", stmt };
    } catch (err) {
      return { type: "err", err: err as Error };
    }
  }
}

const keywordToken = <T extends Keyword>(keyword: T) => ({
  type: TokenType.Keyword,
  value: keyword,
});

type ParsedResult =
  | { type: "success"; stmt: Statement }
  | { type: "err"; err: Error };
