import { match, P } from "ts-pattern";
import {
  AlterStatement,
  Column,
  Consts,
  CreateTableStatement,
  DataType,
  DeleteStatement,
  Expression,
  InsertStatement,
  SelectStatement,
  SQL,
  Statement,
  Transaction,
  UpdateStatement,
} from "./ast";
import { Keyword } from "./keyword";
import { Lexer } from "./lexer";
import PeekableIterator from "./peekable-iterator";
import {
  getTokenValue,
  hasValue,
  isOperator,
  Operator,
  Token,
  TokenType,
} from "./token";
import { isEqual } from "lodash";

export class Parser {
  private input: string;
  private lexer: PeekableIterator<Token>;

  constructor(input: string) {
    this.input = input;
    const iter = new Lexer(input).scan();
    this.lexer = new PeekableIterator(iter);
  }

  private getClonedLexerIter() {
    const iter = new Lexer(this.input).scan();
    const newIter = new PeekableIterator(iter);
    return this.lexer.sync(newIter);
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
        `[Expect Token] Expected token ${TokenType[token.type]}${
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
          `[Parse Ident] Expected identifier, but got ${
            token ? TokenType[token.type] : "EOF"
          } with value ${getTokenValue(token)}`
        );
      });
  }

  private parseExpression(): Expression {
    const ptk = this.peekToken();
    if (isOperator(ptk)) {
      throw new Error(`[Parse Expression] Unexpected operator ${ptk.type}`);
    }

    // Cloning the lexer iterator and collecting tokens until the stop pattern.
    const iter = this.getClonedLexerIter();
    const tks: Token[] = [];

    do {
      const tk = iter.next();
      if (tk.done) {
        throw new Error("[Parse Expression] Unexpected EOF");
      } else {
        tks.push(tk.value);
      }
    } while (isExpressionElement(iter.peek().value));

    // If there are only two tokens, it must be a syntax error.
    // Because the expression must have at least three tokens.
    if (tks.length === 2) {
      throw new Error("[Parse Expression] Unexpected token sync error");
    }

    // If there is only one token, it must be a reference or a constant.
    if (tks.length === 1) {
      const tk = tks[0];
      return match(tk)
        .returnType<Expression>()
        .with({ type: TokenType.Ident }, () => ({
          type: "Reference",
          name: this.parseIdent(),
        }))
        .otherwise(() => this.parseConsts());
    }

    const elms: Expression[] = tks.map((tk) => {
      if (isOperator(tk)) {
        return tk.type === TokenType.StringConcatenation
          ? {
              type: "ConcatExpression",
              expressions: [],
            }
          : {
              type: "BinaryExpression",
              operator: tk,
              left: { type: "Null" },
              right: { type: "Null" },
            };
      }

      return match(tk)
        .returnType<Expression>()
        .with({ type: TokenType.Ident }, ({ value }) => ({
          type: "Reference",
          name: value,
        }))
        .otherwise(parserConsts);
    });

    const expr = elms.reduce((expr, cur) => {
      if (cur.type === "ConcatExpression") {
        cur.expressions.push(expr);
        return cur;
      } else if (cur.type === "BinaryExpression") {
        cur.left = expr;
        return cur;
      } else {
        if (expr.type === "ConcatExpression") {
          expr.expressions.push(cur);
          return expr;
        } else if (expr.type === "BinaryExpression") {
          expr.right = cur;
          return expr;
        } else {
          throw new Error(
            `[Parse Expression] Unexpected expression type ${expr.type}`
          );
        }
      }
    });

    iter.sync(this.lexer);
    return expr;
  }

  private parseConsts(): Consts {
    const token = this.nextToken();
    return parserConsts(token);
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
        throw new Error(`[Parse Column] Unexpected token ${token.type}`);
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
          defaultValue = this.parseConsts();
          break;
        default:
          throw new Error(`[Parse Column] Unexpected keyword ${token.value}`);
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
        throw new Error(
          `[Create Table] Unexpected token ${TokenType[token.type]}`
        );
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
          throw new Error(`[Insert] Unexpected token ${TokenType[token.type]}`);
        }
      }

      values.push(exprs);
      const tk = this.peekToken();
      if (tk.type !== TokenType.Comma) {
        break;
      } else if (tk.type === TokenType.Comma) {
        this.nextToken();
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

  private nextIf(cb: (token: Token) => boolean): boolean {
    const result = cb(this.peekToken());
    if (result) {
      this.nextToken();
    }
    return result;
  }

  private parseUpdate(): UpdateStatement {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Update });
    const tableName = this.parseIdent();
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Set });

    const setClause: { column: string; value: Expression }[] = [];
    do {
      const column = this.parseIdent();
      this.expectToken({ type: TokenType.Equals });
      const value = this.parseExpression();
      setClause.push({ column, value });
      const token = this.peekToken();
      if (token.type === TokenType.Keyword && token.value === Keyword.Where) {
        break;
      }
    } while (this.nextIf((tk) => isEqual({ type: TokenType.Comma }, tk)));

    let whereClause: Expression | undefined;
    const nextToken = this.peekToken();
    if (
      nextToken.type === TokenType.Keyword &&
      nextToken.value === Keyword.Where
    ) {
      this.expectToken({ type: TokenType.Keyword, value: Keyword.Where });
      whereClause = this.parseExpression();
    }

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

  private parseTransaction(): Transaction {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Begin });
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Transaction });
    this.expectToken({ type: TokenType.Semicolon });
    const stmts: Statement[] = [];
    let token = this.peekToken();
    while (token.type !== TokenType.Keyword || token.value !== Keyword.Commit) {
      stmts.push(this.parseStatement());
      this.expectToken({ type: TokenType.Semicolon });
      token = this.peekToken();
    }
    return { type: 'transaction', stmts };
  }

  private parseStatement(): Statement {
    return match(this.peekToken())
      .returnType<Statement>()
      .with(keywordToken(Keyword.Create), () => this.parseCreateTable())
      .with(keywordToken(Keyword.Insert), () => this.parseInsert())
      .with(keywordToken(Keyword.Select), () => this.parseSelect())
      .with(keywordToken(Keyword.Alter), () => this.parseAlter())
      .with(keywordToken(Keyword.Update), () => this.parseUpdate())
      .with(keywordToken(Keyword.Delete), () => this.parseDelete())
      .otherwise((token) => {
        throw new Error(
          `[Statement] Unexpected token ${TokenType[token.type]}`
        );
      });
  }

  public parse(): ParsedResult {
    try {
      const sql = match(this.peekToken())
        .returnType<SQL>()
        .with(keywordToken(Keyword.Begin), () => this.parseTransaction())
        .otherwise(() => this.parseStatement());
      return { type: "success", sql };
    } catch (err) {
      return { type: "err", err: err as Error };
    }
  }
}

const keywordToken = <T extends Keyword>(keyword: T) => ({
  type: TokenType.Keyword,
  value: keyword,
});

type ParsedResult = { type: "success"; sql: SQL } | { type: "err"; err: Error };

const parserConsts = (token: Token): Consts => {
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
};

const isExpressionElement = (token: Token) => {
  if (isOperator(token)) {
    return true;
  }

  switch (token.type) {
    case TokenType.Ident:
    case TokenType.String:
    case TokenType.Number:
      return true;
    case TokenType.Keyword:
      switch (token.value) {
        case Keyword.True:
        case Keyword.False:
        case Keyword.Null:
          return true;
        default:
          return false;
      }
    default:
      return false;
  }
};
