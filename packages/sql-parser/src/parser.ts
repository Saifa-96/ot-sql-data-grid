import { isEqual } from "lodash";
import { match, P } from "ts-pattern";
import { AggregateFunction } from "./aggregate-function";
import {
  AggregateFunctionExpression,
  AlterStatement,
  Column,
  ComparisonOperator,
  Condition,
  Consts,
  CreateTableStatement,
  DataType,
  DeleteStatement,
  Expression,
  InsertStatement,
  Operator,
  Reference,
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
  isComparisonOperator,
  isLogicKeyword,
  isOperator,
  Token,
  TokenType,
} from "./token";

class ParserToolKit {
  private lexer: PeekableIterator<Token>;

  constructor(input: string) {
    const iter = new Lexer(input).scan();
    this.lexer = new PeekableIterator(iter);
  }

  protected nextToken() {
    const result = this.lexer.next();
    if (result.done) {
      throw new Error("Unexpected SQL text.");
    } else {
      return result.value;
    }
  }

  protected peekToken() {
    const result = this.lexer.peek();
    if (result.done) {
      throw new Error("Unexpected SQL text.");
    } else {
      return result.value;
    }
  }

  protected expectToken(token: Token): void {
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

  protected peekIf(cb: (token: Token) => boolean): boolean {
    return cb(this.peekToken());
  }

  protected peekEquals(token: Token): boolean {
    return this.peekIf((tk) => isEqual(token, tk));
  }

  protected nextIf(cb: (token: Token) => boolean): boolean {
    const result = cb(this.peekToken());
    if (result) {
      this.nextToken();
    }
    return result;
  }

  protected nextEquals(token: Token): boolean {
    return this.nextIf((tk) => isEqual(token, tk));
  }

  protected iterateBetweenParen(cb: () => void) {
    this.expectToken({ type: TokenType.OpenParen });
    do {
      cb();
    } while (this.nextEquals({ type: TokenType.Comma }));
    this.expectToken({ type: TokenType.CloseParen });
  }
}

class ParserToken extends ParserToolKit {
  protected parseIdent(): string {
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

  protected parseIsNotKeyword(): boolean {
    return this.nextEquals({ type: TokenType.Keyword, value: Keyword.Not });
  }

  protected parseConsts(): Consts {
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
      .with({ type: TokenType.Keyword, value: Keyword.Current_Date }, () => {
        return { type: "Current_Date" };
      })
      .with({ type: TokenType.Keyword, value: Keyword.Current_Time }, () => {
        return { type: "Current_Time" };
      })
      .with(
        { type: TokenType.Keyword, value: Keyword.Current_Timestamp },
        () => {
          return { type: "Current_Timestamp" };
        }
      )
      .otherwise(() => {
        throw new Error(
          `[Parse Consts] Unexpected token ${token.type} ${getTokenValue(
            token
          )}`
        );
      });
  }

  protected parseReference(): Reference {
    const name = this.parseIdent();
    return { type: "Reference", name };
  }
}

export class Parser extends ParserToken {
  private parseComparisonOperator(): ComparisonOperator {
    const token = this.nextToken();
    switch (token.type) {
      case TokenType.Equals:
        return { type: "Equals", value: "=" };
      case TokenType.NotEquals:
        return { type: "NotEquals", value: "<>" };
      case TokenType.GreaterThan:
        return { type: "GreaterThan", value: ">" };
      case TokenType.LessThan:
        return { type: "LessThan", value: "<" };
      case TokenType.GreaterThanOrEqual:
        return { type: "GreaterThanOrEqual", value: ">=" };
      case TokenType.LessThanOrEqual:
        return { type: "LessThanOrEqual", value: "<=" };
      default:
        throw new Error(
          `[Parse Comparison Operator] Expected comparison operator, but got ${
            token ? TokenType[token.type] : "EOF"
          } with value ${getTokenValue(token)}`
        );
    }
  }

  private parseOperator(): Operator {
    const token = this.nextToken();
    switch (token.type) {
      case TokenType.Plus:
        return { type: "Plus", value: "+" };
      case TokenType.Minus:
        return { type: "Minus", value: "-" };
      case TokenType.Slash:
        return { type: "Slash", value: "/" };
      case TokenType.Asterisk:
        return { type: "Asterisk", value: "*" };
      case TokenType.StringConcatenation:
        return { type: "StringConcatenation", value: "||" };
      default:
        return this.parseComparisonOperator();
    }
  }

  private parseWhereClause(): Condition | undefined {
    const isWhere = this.nextEquals({
      type: TokenType.Keyword,
      value: Keyword.Where,
    });
    if (!isWhere) return;
    let condition = this.parseCondition();
    while (this.peekIf(isLogicKeyword)) {
      const key = this.parseLogicKeyword();
      const isNot = this.parseIsNotKeyword();
      condition = {
        type: "Logic",
        key,
        isNot,
        left: condition,
        right: this.parseCondition(),
      };
    }
    return condition;
  }

  private parseCondition(): Condition {
    const isNot = this.parseIsNotKeyword();
    const isOpenParen = this.nextIf((tk) =>
      isEqual({ type: TokenType.OpenParen }, tk)
    );

    let condition: Condition;

    const reference = this.parseReference();

    if (this.peekIf(isComparisonOperator)) {
      // const token = this.nextToken() as ComparisonOperatorToken;
      const operator = this.parseComparisonOperator();
      const expr = this.parseExpression();
      condition = {
        type: "Comparison",
        isNot,
        operator: operator,
        left: reference,
        right: expr,
      };
    } else if (
      this.nextEquals({ type: TokenType.Keyword, value: Keyword.Is })
    ) {
      const isNotKeyword = this.parseIsNotKeyword();
      this.expectToken({ type: TokenType.Keyword, value: Keyword.Null });
      condition = {
        type: "Is-Null",
        isNot: isNot ? !isNotKeyword : isNotKeyword,
        reference,
      };
    } else {
      const isNotKeyword = this.parseIsNotKeyword();
      if (
        this.nextEquals({ type: TokenType.Keyword, value: Keyword.Between })
      ) {
        const left = this.parseExpression();
        this.expectToken({ type: TokenType.Keyword, value: Keyword.And });
        const right = this.parseExpression();
        condition = {
          type: "Between",
          isNot: isNot ? !isNotKeyword : isNotKeyword,
          reference,
          left,
          right,
        };
      } else {
        this.expectToken({ type: TokenType.Keyword, value: Keyword.In });
        const exprs: Expression[] = [];
        this.iterateBetweenParen(() => {
          const expr = this.parseExpression();
          exprs.push(expr);
        });
        condition = {
          type: "In",
          isNot: isNot ? !isNotKeyword : isNotKeyword,
          reference,
          exprs,
        };
      }
    }

    if (this.peekIf(isLogicKeyword)) {
      const key = this.parseLogicKeyword();
      const isNot = this.parseIsNotKeyword();
      condition = {
        type: "Logic",
        key,
        isNot,
        left: condition,
        right: this.parseCondition(),
      };
    }

    if (isOpenParen) {
      this.expectToken({ type: TokenType.CloseParen });
    }

    return condition;
  }

  private parseLogicKeyword(): "and" | "or" {
    return match(this.nextToken())
      .returnType<"and" | "or">()
      .with({ type: TokenType.Keyword, value: Keyword.And }, () => "and")
      .with({ type: TokenType.Keyword, value: Keyword.Or }, () => "or")
      .otherwise((token) => {
        throw new Error(`[Parse Logic Keyword] Unexpected token ${token.type}`);
      });
  }

  private parseAggregateFunction(): AggregateFunctionExpression {
    const token = this.nextToken();
    this.expectToken({ type: TokenType.OpenParen });
    const expr = this.parseExpression();
    this.expectToken({ type: TokenType.CloseParen });
    return match(token)
      .returnType<AggregateFunctionExpression>()
      .with(
        { type: TokenType.AggregateFunction, value: AggregateFunction.Avg },
        () => ({
          type: "Avg",
          expr,
        })
      )
      .with(
        { type: TokenType.AggregateFunction, value: AggregateFunction.Count },
        () => ({
          type: "Count",
          expr,
        })
      )
      .with(
        { type: TokenType.AggregateFunction, value: AggregateFunction.Max },
        () => ({
          type: "Max",
          expr,
        })
      )
      .with(
        { type: TokenType.AggregateFunction, value: AggregateFunction.Min },
        () => ({
          type: "Min",
          expr,
        })
      )
      .with(
        { type: TokenType.AggregateFunction, value: AggregateFunction.Sum },
        () => ({
          type: "Sum",
          expr,
        })
      )
      .otherwise(() => {
        throw new Error(
          `[Parse Aggregate Function] Unexpected token ${token.type}`
        );
      });
  }

  private parseExpression(): Expression {
    let expr = match(this.peekToken())
      .returnType<Expression>()
      .with({ type: TokenType.AggregateFunction }, () =>
        this.parseAggregateFunction()
      )
      .with({ type: TokenType.OpenParen }, () => {
        this.expectToken({ type: TokenType.OpenParen });
        const stmt = this.parseSelect();
        this.expectToken({ type: TokenType.CloseParen });
        return { type: "SubqueryExpression", stmt };
      })
      .with({ type: TokenType.Ident }, () => this.parseReference())
      .otherwise(() => this.parseConsts());

    if (this.peekIf(isOperator)) {
      // const tk = this.nextToken() as OperatorToken;
      const tk = this.parseOperator();
      const right = this.parseExpression();
      return {
        type: "OperatorExpression",
        operator: tk,
        left: expr,
        right,
      };
    }
    return expr;
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
      .with({ value: Keyword.DATETIME }, () => DataType.Datetime)
      .otherwise((token) => {
        throw new Error(`[Parse Column] Unexpected token ${token.type}`);
      });

    let nullable: boolean | undefined;
    let defaultValue: Consts | undefined;
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

  private parseValuesClause(): Expression[][] {
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
    return values;
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

    if (this.peekEquals({ type: TokenType.Keyword, value: Keyword.Select })) {
      const select = this.parseSelect();
      return { type: "insert", tableName, columns, select };
    } else {
      const values = this.parseValuesClause();
      return { type: "insert", tableName, columns, values };
    }
  }

  private parseSelect(): SelectStatement {
    const columns = this.parseSelectColumns();
    const unionAll = this.parseSelectUnionAll();
    const table = this.parseSelectTableInfo();
    const where = this.parseWhereClause();
    return {
      type: "select",
      columns,
      table,
      unionAll,
      where,
    };
  }

  private parseSelectColumns(): SelectStatement["columns"] {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Select });
    const asterisk = this.nextEquals({ type: TokenType.Asterisk });
    const columns: { expr: Expression; alias?: string }[] = [];
    if (!asterisk) {
      do {
        const expr = this.parseExpression();
        const alias = this.nextEquals({
          type: TokenType.Keyword,
          value: Keyword.As,
        })
          ? this.parseIdent()
          : undefined;
        columns.push({ expr, alias });

        if (this.peekEquals({ type: TokenType.Keyword, value: Keyword.From })) {
          break;
        }
      } while (this.nextEquals({ type: TokenType.Comma }));
    }
    return asterisk ? "*" : columns;
  }

  private parseSelectTableInfo(): SelectStatement["table"] {
    if (!this.nextEquals({ type: TokenType.Keyword, value: Keyword.From }))
      return undefined;

    let tableInfo: SelectStatement["table"];
    if (this.nextEquals({ type: TokenType.OpenParen })) {
      const values = this.parseValuesClause();
      this.expectToken({ type: TokenType.CloseParen });
      this.expectToken({ type: TokenType.Keyword, value: Keyword.As });
      const tempTableName = this.parseIdent();
      const columns: string[] = [];
      this.expectToken({ type: TokenType.OpenParen });
      do {
        columns.push(this.parseIdent());
        this.nextEquals({ type: TokenType.Comma });
      } while (!this.nextEquals({ type: TokenType.CloseParen }));
      tableInfo = {
        type: "values",
        values,
        columns,
        tempTableName,
      };
    } else {
      tableInfo = {
        type: "table-name",
        name: this.parseIdent(),
      };
    }
    return tableInfo;
  }

  private parseSelectUnionAll(): SelectStatement["unionAll"] {
    const unionAll: Expression[][] = [];
    while (this.nextEquals({ type: TokenType.Keyword, value: Keyword.Union })) {
      this.expectToken({ type: TokenType.Keyword, value: Keyword.All });
      this.expectToken({ type: TokenType.Keyword, value: Keyword.Select });
      const exprs: Expression[] = [];
      do {
        const expr = this.parseExpression();
        exprs.push(expr);
      } while (this.nextEquals({ type: TokenType.Comma }));
      unionAll.push(exprs);
    }
    return unionAll.length === 0 ? undefined : unionAll;
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
      this.expectToken({ type: TokenType.Equals });
      const value = this.parseExpression();
      setClause.push({ column, value });
      if (this.peekEquals({ type: TokenType.Keyword, value: Keyword.Where })) {
        break;
      }
    } while (this.nextEquals({ type: TokenType.Comma }));

    const whereClause = this.parseWhereClause();

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
    let where: Condition | undefined;
    if (this.nextEquals({ type: TokenType.Keyword, value: Keyword.Where })) {
      where = this.parseCondition();
    }
    return { type: "delete", tableName, where };
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
    return { type: "transaction", stmts };
  }

  private parseStatement(): Statement {
    return match(this.peekToken())
      .returnType<Statement>()
      .with(keyword(Keyword.Create), () => this.parseCreateTable())
      .with(keyword(Keyword.Insert), () => this.parseInsert())
      .with(keyword(Keyword.Select), () => this.parseSelect())
      .with(keyword(Keyword.Alter), () => this.parseAlter())
      .with(keyword(Keyword.Update), () => this.parseUpdate())
      .with(keyword(Keyword.Delete), () => this.parseDelete())
      .otherwise((token) => {
        throw new Error(
          `[Statement] Unexpected token ${TokenType[token.type]}`
        );
      });
  }

  public safeParse(): ParsedResult {
    try {
      const sql = match(this.peekToken())
        .returnType<SQL>()
        .with(keyword(Keyword.Begin), () => this.parseTransaction())
        .otherwise(() => this.parseStatement());
      return { type: "success", sql };
    } catch (err) {
      return { type: "err", err: err as Error };
    }
  }
}

const keyword = <T extends Keyword>(keyword: T) => ({
  type: TokenType.Keyword,
  value: keyword,
});

type ParsedResult = { type: "success"; sql: SQL } | { type: "err"; err: Error };
