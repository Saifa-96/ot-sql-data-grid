import { isEqual } from "lodash";
import { isMatching, match, P } from "ts-pattern";
import {
  AggregateFunc,
  AlterStatement,
  Case,
  Column,
  Consts,
  CreateTableStatement,
  Dataset,
  DataType,
  DeleteStatement,
  Expression,
  InsertStatement,
  JoinClause,
  JoinCondition,
  LimitClause,
  Operator,
  OrderByClause,
  Reference,
  ScalarFunc,
  SelectStatement,
  SQL,
  Statement,
  Transaction,
  UpdateStatement,
  WhereClause,
} from "./ast";
import { AggregateFunction, ScalarFunction } from "./function";
import { Keyword } from "./keyword";
import { Lexer } from "./lexer";
import PeekableIterator from "./peekable-iterator";
import { Token, TokenType } from "./token";

class ParserToolKit {
  private lexer: PeekableIterator<Token>;

  constructor(input: string) {
    const iter = new Lexer(input).scan();
    this.lexer = new PeekableIterator(
      iter,
      isMatching({
        type: P.union(TokenType.SingleLineComment, TokenType.MultiLineComment),
      })
    );
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
      const hasValue = "value" in curToken;
      const curValue = hasValue ? curToken.value : undefined;
      throw new Error(
        `[Expect Token] Expected token ${TokenType[token.type]}${
          "value" in token ? ` with value ${token.value}` : ""
        }, but got ${
          curToken ? TokenType[curToken.type] : "EOF"
        } with value ${curValue}`
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
        const value = "value" in token ? token.value : undefined;
        throw new Error(
          `[Parse Ident] Expected identifier, but got ${
            token ? TokenType[token.type] : "EOF"
          } with value ${value}`
        );
      });
  }

  protected parseIsNotKeyword(): boolean {
    return this.nextEquals({ type: TokenType.Keyword, value: Keyword.Not });
  }

  protected parseString() {
    const token = this.nextToken();
    return match(token)
      .returnType<string>()
      .with({ type: TokenType.String, value: P.select() }, (v) => v as string)
      .otherwise(() => {
        const value = "value" in token ? token.value : undefined;
        throw new Error(
          `[Parse String] Expected string, but got ${
            token ? TokenType[token.type] : "EOF"
          } with value ${value}`
        );
      });
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
      .with({ type: TokenType.Asterisk }, () => ({ type: "Asterisk" }))
      .with(
        { type: TokenType.Keyword, value: Keyword.Current_Timestamp },
        () => {
          return { type: "Current_Timestamp" };
        }
      )
      .otherwise(() => {
        const value = "value" in token ? token.value : undefined;
        throw new Error(
          `[Parse Consts] Unexpected token ${token.type} ${value}`
        );
      });
  }

  protected parseReference(): Reference {
    const name = this.parseIdent();
    if (this.nextEquals({ type: TokenType.Dot })) {
      const column = this.parseIdent();
      return { type: "Reference", name: column, table: name };
    }
    return { type: "Reference", name };
  }
}

export class Parser extends ParserToken {
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
        const value = "value" in token ? token.value : undefined;
        throw new Error(
          `[Parse Operator] Expected operator, but got ${
            token ? TokenType[token.type] : "EOF"
          } with value ${value}`
        );
    }
  }

  // TODO Validating expression's result must be a number
  private parseLimitClause(): LimitClause {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Limit });
    const limit = this.parseExpression();
    let offset: Expression | undefined;
    if (this.nextEquals({ type: TokenType.Keyword, value: Keyword.Offset })) {
      offset = this.parseExpression();
    }
    return {
      expr: limit,
      offset,
    };
  }

  private parseOrderByClause(): OrderByClause[] {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Order });
    this.expectToken({ type: TokenType.Keyword, value: Keyword.By });
    const orderBy: OrderByClause[] = [];
    do {
      const expr = this.parseExpression();
      const asc = this.nextEquals({
        type: TokenType.Keyword,
        value: Keyword.Asc,
      });
      const desc = this.nextEquals({
        type: TokenType.Keyword,
        value: Keyword.Desc,
      });
      orderBy.push({
        expr,
        order: asc ? "asc" : desc ? "desc" : undefined,
      });
    } while (this.nextEquals({ type: TokenType.Comma }));
    return orderBy;
  }

  private parseWhereClause(): WhereClause {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Where });
    const not = this.parseIsNotKeyword();
    const expr = this.parseExpression();
    return { not, expr };
  }

  private parseScalarFunction(): ScalarFunc {
    const token = this.nextToken();
    this.expectToken({ type: TokenType.OpenParen });
    const scalarExpr = match(token)
      .returnType<ScalarFunc>()
      .with({ value: ScalarFunction.Cast }, () => {
        const expr = this.parseExpression();
        this.expectToken({ type: TokenType.Keyword, value: Keyword.As });
        const as = this.parseDataType();
        return { type: "Cast", expr, as };
      })
      .with(
        {
          value: P.union(
            ScalarFunction.Trim,
            ScalarFunction.LTrim,
            ScalarFunction.RTrim
          ),
        },
        ({ value }) => {
          const expr = this.parseExpression();
          let chars: Expression | undefined;
          if (this.nextEquals({ type: TokenType.Comma })) {
            chars = this.parseExpression();
          }
          return {
            type: value,
            expr,
            chars,
          };
        }
      )
      .with(
        {
          value: P.union(
            ScalarFunction.Length,
            ScalarFunction.Upper,
            ScalarFunction.Lower
          ),
        },
        ({ value }) => {
          return { type: value, expr: this.parseExpression() };
        }
      )
      .with({ value: ScalarFunction.Date }, () => {
        const timeValue = this.parseExpression();
        let modifiers: string[] | undefined;
        if (this.nextEquals({ type: TokenType.Comma })) {
          modifiers = [];
          do {
            modifiers.push(this.parseString());
          } while (this.nextEquals({ type: TokenType.Comma }));
        }
        return { type: "Date", timeValue, modifiers };
      })
      .otherwise(() => {
        throw new Error(
          `[Parse Scalar Function] Unexpected token ${token.type}`
        );
      });
    this.expectToken({ type: TokenType.CloseParen });
    return scalarExpr;
  }

  private parseAggregateFunction(): AggregateFunc {
    const token = this.nextToken();
    this.expectToken({ type: TokenType.OpenParen });
    const aggExpr = match(token)
      .returnType<AggregateFunc>()
      .with(
        {
          type: TokenType.AggregateFunc,
          value: P.union(
            AggregateFunction.Avg,
            AggregateFunction.Count,
            AggregateFunction.Max,
            AggregateFunction.Min,
            AggregateFunction.Sum,
            AggregateFunction.Total
          ),
        },
        ({ value }) => {
          const distinct = this.nextEquals({
            type: TokenType.Keyword,
            value: Keyword.Distinct,
          });
          return {
            type: value,
            expr: this.parseExpression(),
            distinct,
          };
        }
      )
      .with(
        {
          type: TokenType.AggregateFunc,
          value: AggregateFunction.GroupConcat,
        },
        () => {
          const expr = this.parseExpression();
          let separator: Expression | undefined;
          if (this.nextEquals({ type: TokenType.Comma })) {
            separator = this.parseExpression();
          }
          let orderBy: OrderByClause[] | undefined;
          if (
            this.peekEquals({ type: TokenType.Keyword, value: Keyword.Order })
          ) {
            orderBy = this.parseOrderByClause();
          }
          return { type: "GroupConcat", expr, separator, orderBy };
        }
      )
      .otherwise(() => {
        throw new Error(
          `[Parse Aggregate Function] Unexpected token ${token.type}`
        );
      });
    this.expectToken({ type: TokenType.CloseParen });
    return aggExpr;
  }

  private parseCase(): Case {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Case });
    const cases: { when: Expression; then: Expression }[] = [];
    do {
      this.expectToken({ type: TokenType.Keyword, value: Keyword.When });
      const when = this.parseExpression();
      this.expectToken({ type: TokenType.Keyword, value: Keyword.Then });
      const then = this.parseExpression();
      cases.push({ when, then });
    } while (this.peekEquals({ type: TokenType.Keyword, value: Keyword.When }));
    let elseExpr: Expression | undefined;
    if (this.nextEquals({ type: TokenType.Keyword, value: Keyword.Else })) {
      elseExpr = this.parseExpression();
    }
    this.expectToken({ type: TokenType.Keyword, value: Keyword.End });
    return { type: "Case", cases, else: elseExpr };
  }

  private parsePrimaryExpression(): Expression {
    let expr = match(this.peekToken())
      .returnType<Expression>()
      .with({ value: Keyword.Not }, () => {
        this.nextToken();
        return {
          type: "Not",
          expr: this.parseExpression(),
        };
      })
      .with({ type: TokenType.Keyword, value: Keyword.Case }, () =>
        this.parseCase()
      )
      .with({ type: TokenType.ScalarFunc }, () => this.parseScalarFunction())
      .with({ type: TokenType.AggregateFunc }, () =>
        this.parseAggregateFunction()
      )
      .with({ type: TokenType.Keyword, value: Keyword.Select }, () => {
        const stmt = this.parseSelect();
        return { type: "Subquery", stmt };
      })
      .with({ type: TokenType.Ident }, () => this.parseReference())
      .otherwise(() => this.parseConsts());
    return expr;
  }

  // TODO: prettify this method
  private parseExpression(priority: number = 0): Expression {
    let finalExpr: Expression | null = null;
    while (true) {
      const isOpenParen = this.nextEquals({ type: TokenType.OpenParen });
      const priorityLevel = isOpenParen ? 0 : priority;
      let expr: Expression = finalExpr ?? this.parsePrimaryExpression();

      while (true) {
        if (priorityLevel === 0) {
          const key = match(this.peekToken())
            .with({ value: Keyword.And }, () => "and" as const)
            .with({ value: Keyword.Or }, () => "or" as const)
            .otherwise(() => null);
          if (key) {
            this.nextToken();
            const right = this.parseExpression();
            expr = { type: "Logic", key, left: expr, right };
            continue;
          }
        }

        const not = this.parseIsNotKeyword();
        const tk: Expression | null = match(this.peekToken())
          .returnType<Expression | null>()
          .with({ value: Keyword.Like }, () => {
            this.expectToken({ type: TokenType.Keyword, value: Keyword.Like });
            const pattern = this.parseExpression();
            let escape: Expression | undefined;
            if (
              this.nextEquals({
                type: TokenType.Keyword,
                value: Keyword.Escape,
              })
            ) {
              escape = this.parseExpression();
            }
            return {
              type: "Like",
              not,
              target: expr,
              pattern,
              escape,
            };
          })
          .with({ value: Keyword.Glob }, () => {
            this.expectToken({ type: TokenType.Keyword, value: Keyword.Glob });
            const pattern = this.parseExpression();
            return {
              type: "Glob",
              not,
              target: expr,
              pattern,
            };
          })
          .with({ value: Keyword.Between }, () => {
            this.expectToken({
              type: TokenType.Keyword,
              value: Keyword.Between,
            });
            const lowerBound = this.parseExpression(1);
            this.expectToken({ type: TokenType.Keyword, value: Keyword.And });
            const upperBound = this.parseExpression(1);
            return {
              type: "Between",
              not,
              target: expr,
              lowerBound,
              upperBound,
            };
          })
          .with({ value: Keyword.In }, () => {
            this.expectToken({ type: TokenType.Keyword, value: Keyword.In });
            const values: Expression[] = [];
            this.iterateBetweenParen(() => {
              const expr = this.parseExpression();
              values.push(expr);
            });
            return {
              type: "In",
              not,
              target: expr,
              values,
            };
          })
          .otherwise(() => {
            if (not) {
              throw new Error(
                `[Parse Expression] Unexpected token ${
                  this.peekToken().type
                } after "NOT" keyword`
              );
            }
            return null;
          });
        if (tk) {
          expr = tk;
          continue;
        }

        const tk1 = match(this.peekToken())
          .returnType<Expression | null>()
          .with(
            {
              type: P.union(
                TokenType.Asterisk,
                TokenType.Plus,
                TokenType.Minus,
                TokenType.Slash,
                TokenType.Equals,
                TokenType.NotEquals,
                TokenType.StringConcatenation,
                TokenType.GreaterThan,
                TokenType.LessThan,
                TokenType.GreaterThanOrEqual,
                TokenType.LessThanOrEqual
              ),
            },
            () => {
              const tk = this.parseOperator();
              const right = this.parseExpression(1);
              return {
                type: "Binary",
                operator: tk,
                left: expr,
                right,
              };
            }
          )
          .with({ value: Keyword.Is }, () => {
            this.expectToken({ type: TokenType.Keyword, value: Keyword.Is });
            const not = this.parseIsNotKeyword();
            const value = this.parseExpression();
            return {
              type: "Is",
              not,
              target: expr,
              value,
            };
          })
          .otherwise(() => null);

        if (tk1) {
          expr = tk1;
          continue;
        }

        break;
      }

      finalExpr = expr;
      if (isOpenParen) {
        this.expectToken({ type: TokenType.CloseParen });
        finalExpr.priority = true;
        continue;
      }
      break;
    }
    if (!finalExpr) {
      const tk = this.peekToken();
      throw new Error(
        `[Parse Expression] Unexpected token ${tk.type} with value ${
          "value" in tk ? tk.value : ""
        }`
      );
    }
    return finalExpr;
  }

  private parseDataType(): DataType {
    const token = this.nextToken();
    return match(token)
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
      .with({ value: Keyword.Datetime }, () => DataType.Datetime)
      .otherwise((token) => {
        throw new Error(`[Parse Column] Unexpected token ${token.type}`);
      });
  }

  private parseColumn(): Column {
    const name = this.parseIdent();
    const datatype = this.parseDataType();
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
    do {
      this.expectToken({ type: TokenType.OpenParen });
      const exprs: Expression[] = [];

      do {
        exprs.push(this.parseExpression());
      } while (this.nextEquals({ type: TokenType.Comma }));

      this.expectToken({ type: TokenType.CloseParen });
      values.push(exprs);
    } while (this.nextEquals({ type: TokenType.Comma }));
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

  private isJoinKeyword(): boolean {
    return isMatching(
      {
        value: P.union(
          Keyword.Natural,
          Keyword.Inner,
          Keyword.Left,
          Keyword.Right,
          Keyword.Full,
          Keyword.Cross,
          Keyword.Join
        ),
      },
      this.peekToken()
    );
  }

  private parseJoinConditionClause(): JoinCondition {
    return match(this.nextToken())
      .returnType<JoinCondition>()
      .with({ value: Keyword.On }, () => {
        return {
          type: "on",
          expr: this.parseExpression(),
        };
      })
      .with({ value: Keyword.Using }, () => {
        const columns: string[] = [];
        this.expectToken({ type: TokenType.OpenParen });
        do {
          columns.push(this.parseIdent());
        } while (this.nextEquals({ type: TokenType.Comma }));
        this.expectToken({ type: TokenType.CloseParen });
        return {
          type: "using",
          columns,
        };
      })
      .otherwise(() => {
        throw new Error(
          `[Parse Join Condition] Unexpected token ${this.peekToken().type}`
        );
      });
  }

  private parseJoinClause(): JoinClause {
    const joinClause: JoinClause = [];
    do {
      const isNatural = this.nextEquals({
        type: TokenType.Keyword,
        value: Keyword.Natural,
      });

      match(this.nextToken())
        .with(
          { value: P.union(Keyword.Left, Keyword.Right, Keyword.Full) },
          ({ value }) => {
            const type = match(value)
              .with(Keyword.Left, () => "left" as const)
              .with(Keyword.Right, () => "right" as const)
              .with(Keyword.Full, () => "full" as const)
              .exhaustive();
            const isOuter = this.nextEquals({
              type: TokenType.Keyword,
              value: Keyword.Outer,
            });
            this.expectToken({
              type: TokenType.Keyword,
              value: Keyword.Join,
            });
            const tableName = this.parseCollection();
            const condition: JoinCondition = isNatural
              ? { type: "natural" }
              : this.parseJoinConditionClause();
            joinClause.push({
              outer: isOuter,
              type,
              condition,
              table: tableName,
            });
          }
        )
        .with({ value: Keyword.Cross }, () => {
          this.expectToken({
            type: TokenType.Keyword,
            value: Keyword.Join,
          });
          joinClause.push({
            type: "cross",
            table: this.parseCollection(),
          });
        })
        .with({ value: P.union(Keyword.Inner, Keyword.Join) }, ({ value }) => {
          if (value === Keyword.Inner) {
            this.expectToken({
              type: TokenType.Keyword,
              value: Keyword.Join,
            });
          }
          const tableName = this.parseCollection();
          const condition: JoinCondition = isNatural
            ? { type: "natural" }
            : this.parseJoinConditionClause();
          joinClause.push({
            type: "inner",
            condition,
            table: tableName,
          });
        })
        .otherwise(() => {
          throw new Error(
            `[Parse Join Clause] Unexpected token ${
              TokenType[this.peekToken().type]
            }`
          );
        });
    } while (this.isJoinKeyword());
    return joinClause;
  }

  private parseSelect(): SelectStatement {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.Select });
    let distinct: boolean | undefined;
    if (this.nextEquals({ type: TokenType.Keyword, value: Keyword.Distinct })) {
      distinct = true;
    }
    const columns = this.parseSelectColumns();
    const unionAll = this.parseUnionAll();
    let dataset: Dataset[] | undefined;
    if (this.peekEquals({ type: TokenType.Keyword, value: Keyword.From })) {
      dataset = this.parseDataSet();
    }
    let join: JoinClause | undefined;
    if (this.isJoinKeyword()) {
      join = this.parseJoinClause();
    }
    let where: WhereClause | undefined;
    if (this.peekEquals({ type: TokenType.Keyword, value: Keyword.Where })) {
      where = this.parseWhereClause();
    }
    let groupBy: Expression[] | undefined;
    if (this.nextEquals({ type: TokenType.Keyword, value: Keyword.Group })) {
      this.expectToken({ type: TokenType.Keyword, value: Keyword.By });
      groupBy = [];
      do {
        const expr = this.parseExpression();
        groupBy.push(expr);
      } while (this.nextEquals({ type: TokenType.Comma }));
    }
    let having: Expression | undefined;
    if (this.nextEquals({ type: TokenType.Keyword, value: Keyword.Having })) {
      having = this.parseExpression();
    }
    let orderBy: OrderByClause[] | undefined;
    if (this.peekEquals({ type: TokenType.Keyword, value: Keyword.Order })) {
      orderBy = this.parseOrderByClause();
    }
    let limit: LimitClause | undefined;
    if (this.peekEquals({ type: TokenType.Keyword, value: Keyword.Limit })) {
      limit = this.parseLimitClause();
    }
    return {
      type: "select",
      distinct,
      columns,
      from: dataset,
      join,
      unionAll,
      where,
      groupBy,
      having,
      orderBy,
      limit,
    };
  }

  private parseSelectColumns(): SelectStatement["columns"] {
    const asterisk = this.nextEquals({ type: TokenType.Asterisk });
    if (asterisk) return "*";

    const columns: { expr: Expression; alias?: string }[] = [];
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
    return columns;
  }

  private parseCollection(): Dataset {
    if (this.nextEquals({ type: TokenType.OpenParen })) {
      const stmt = this.parseSelect();
      this.expectToken({ type: TokenType.CloseParen });
      let alias: string | undefined;
      if (this.nextEquals({ type: TokenType.Keyword, value: Keyword.As })) {
        alias = this.parseIdent();
      }
      return {
        type: "subquery",
        stmt,
        alias,
      };
    } else {
      const name = this.parseIdent();
      let alias: string | undefined;
      if (
        this.nextEquals({ type: TokenType.Keyword, value: Keyword.As }) ||
        this.peekIf((tk) => tk.type === TokenType.Ident)
      ) {
        alias = this.parseIdent();
      }
      return {
        type: "table-name",
        name,
        alias,
      };
    }
  }

  private parseDataSet(): Dataset[] {
    this.expectToken({ type: TokenType.Keyword, value: Keyword.From });
    let dataset: Dataset[] = [];
    do {
      dataset.push(this.parseCollection());
    } while (this.nextEquals({ type: TokenType.Comma }));

    return dataset;
  }

  private parseUnionAll(): SelectStatement["unionAll"] {
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

    let whereClause: WhereClause | undefined;
    if (this.peekEquals({ type: TokenType.Keyword, value: Keyword.Where })) {
      whereClause = this.parseWhereClause();
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
    let where: WhereClause | undefined;
    if (this.peekEquals({ type: TokenType.Keyword, value: Keyword.Where })) {
      where = this.parseWhereClause();
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
