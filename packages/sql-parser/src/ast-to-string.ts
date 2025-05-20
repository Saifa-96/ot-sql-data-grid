import { match, P } from "ts-pattern";
import {
  Column,
  Dataset,
  Expression,
  JoinClause,
  JoinCondition,
  LimitClause,
  OrderByClause,
  SelectStatement,
  SQL,
  WhereClause,
} from "./ast";

export const sql2String = (sql: SQL): string => {
  return match(sql)
    .with({ type: "transaction" }, ({ stmts }) => {
      return Content.start()
        .appendSpan("BEGIN TRANSACTION;")
        .appendParagraph()
        .appendSpan(stmts.map(sql2String).join("\n"))
        .appendParagraph()
        .appendSpan("COMMIT;")
        .toString();
    })
    .with({ type: "create-table" }, (stmt) => {
      return Content.start()
        .appendSpan("CREATE TABLE")
        .appendSpan(stmt.name)
        .appendSpan("(", stmt.columns.map(column2String).join(", "), ");")
        .toString();
    })
    .with({ type: "insert", values: P.nonNullable }, (stmt) => {
      return Content.start()
        .appendSpan("INSERT INTO")
        .appendSpan(stmt.tableName)
        .appendSpan(`(${stmt.columns ? stmt.columns.join(", ") : "*"})`)
        .appendSpan("VALUES")
        .appendSpan(
          stmt.values
            .map((row) => `(${row.map(expression2String).join(", ")})`)
            .join(", "),
          ";"
        )
        .toString();
    })
    .with({ type: "insert", select: P.nonNullable }, (stmt) => {
      return Content.start()
        .appendSpan("INSERT INTO")
        .appendSpan(stmt.tableName)
        .appendSpan(`(${stmt.columns ? stmt.columns.join(", ") : "*"})`)
        .appendParagraph()
        .appendSpan(selectStm2String(stmt.select), ";")
        .toString();
    })
    .with({ type: "select" }, (stmt) => {
      return selectStm2String(stmt) + ";";
    })
    .with({ type: "alter", action: "add" }, (stmt) => {
      return Content.start()
        .appendSpan("ALTER TABLE")
        .appendSpan(stmt.tableName)
        .appendSpan("ADD COLUMN")
        .appendSpan(column2String(stmt.column), ";")
        .toString();
    })
    .with({ type: "alter", action: "drop" }, (stmt) => {
      return Content.start()
        .appendSpan("ALTER TABLE")
        .appendSpan(stmt.tableName)
        .appendSpan("DROP COLUMN")
        .appendSpan(stmt.columnName, ";")
        .toString();
    })
    .with({ type: "update" }, (stmt) => {
      return Content.start()
        .appendSpan("UPDATE")
        .appendSpan(stmt.tableName)
        .appendSpan("SET")
        .appendSpan(
          stmt.set
            .map((set) => `${set.column} = ${expression2String(set.value)}`)
            .join(", ")
        )
        .appendSpansIf(stmt.where, where2String, ";")
        .toString();
    })
    .with({ type: "delete" }, (stmt) => {
      return Content.start()
        .appendSpan("DELETE FROM")
        .appendSpan(stmt.tableName)
        .appendSpansIf(stmt.where, where2String)
        .concatSpans(";")
        .toString();
    })
    .exhaustive();
};

const selectStm2String = ({
  columns,
  distinct,
  where: whereClause,
  orderBy,
  limit,
  from: dataset,
  join,
  groupBy,
  having,
  unionAll,
}: SelectStatement): string => {
  const content = Content.start("SELECT");
  content.appendSpansIf(distinct, "DISTINCT");
  if (columns === "*") {
    content.appendSpan("*");
  } else {
    const columnsStr = columns
      .map((col) => {
        return Content.start()
          .appendSpan(expression2String(col.expr))
          .appendSpansIf(col.alias, "AS", (v) => v)
          .toString();
      })
      .join(", ");
    content.appendSpan(columnsStr);
  }
  content.appendParagraph();
  content.appendSpansIf(dataset, dataset2String).appendParagraph();
  content.appendSpansIf(join, join2String).appendParagraph();
  content.appendSpansIf(unionAll, unionAll2String).appendParagraph();
  content.appendSpansIf(whereClause, where2String).appendParagraph();
  content
    .appendSpansIf(groupBy, "GROUP BY", (v) =>
      v.map(expression2String).join(", ")
    )
    .appendParagraph();
  content.appendSpansIf(having, "HAVING", expression2String).appendParagraph();
  content.appendSpansIf(orderBy, orderBy2String).appendParagraph();
  content.appendSpansIf(limit, limit2String).appendParagraph();
  return content.toString();
};

const joinCondition2String = (condition: JoinCondition): string => {
  return match(condition)
    .with({ type: "natural" }, () => "NATURAL")
    .with({ type: "on" }, (config) => {
      return Content.start()
        .appendSpan("ON")
        .appendSpan(expression2String(config.expr))
        .toString();
    })
    .with({ type: "using" }, (config) => {
      return Content.start()
        .appendSpan("USING")
        .appendSpan(`(${config.columns.join(", ")})`)
        .toString();
    })
    .exhaustive();
};

const join2String = (join: JoinClause): string => {
  const content = Content.start();
  join.forEach((joinClause) => {
    match(joinClause)
      .with({ type: P.union("right", "left", "full") }, (config) => {
        content
          .appendSpansIf(config.condition.type === "natural", "NATURAL")
          .appendSpan(config.type.toUpperCase())
          .appendSpansIf(config.outer, "OUTER")
          .appendSpan("JOIN")
          .appendSpan(singleDataset2String(config.table));
        if (config.condition.type !== "natural") {
          content.appendSpan(joinCondition2String(config.condition));
        }
        content.appendParagraph();
      })
      .with({ type: "inner" }, (config) => {
        content
          .appendSpansIf(config.condition.type === "natural", "NATURAL")
          .appendSpan("INNER JOIN")
          .appendSpan(singleDataset2String(config.table));
        if (config.condition.type !== "natural") {
          content.appendSpan(joinCondition2String(config.condition));
        }
        content.appendParagraph();
      })
      .with({ type: "cross" }, () => {
        content
          .appendSpan("CROSS JOIN")
          .appendSpan(singleDataset2String(joinClause.table))
          .appendParagraph();
      })
      .exhaustive();
  });
  return content.toString();
};

const singleDataset2String = (dataset: Dataset) => {
  const content = Content.start();
  if (dataset.type === "table-name") {
    content.appendSpan(dataset.name);
    content.appendSpansIf(dataset.alias, "AS", (v) => v);
  } else {
    content
      .appendSpan("(")
      .concatSpans(selectStm2String(dataset.stmt), ")")
      .appendSpansIf(dataset.alias, "AS", (v) => v);
  }
  return content.toString();
};

const dataset2String = (dataset: Dataset[]): string => {
  const content = Content.start("FROM");
  const datasetStr = dataset.map(singleDataset2String).join(",");
  content.appendParagraph(datasetStr);
  return content.toString();
};

const unionAll2String = (unionAll: Expression[][]): string => {
  const content = Content.start();
  unionAll.forEach((row) => {
    content
      .appendParagraph("UNION ALL")
      .appendParagraph("SELECT", row.map(expression2String).join(", "));
  });
  return content.toString();
};

const where2String = (where: WhereClause): string => {
  return Content.start()
    .appendSpan("WHERE")
    .appendSpansIf(where.not, "NOT")
    .appendSpan(expression2String(where.expr))
    .toString();
};

const expression2String = (expr: Expression): string => {
  const getContent = () => {
    switch (expr.type) {
      case "Null":
        return "NULL";
      case "Current_Date":
        return "CURRENT_DATE";
      case "Current_Time":
        return "CURRENT_TIME";
      case "Current_Timestamp":
        return "CURRENT_TIMESTAMP";
      case "Asterisk":
        return "*";
      case "Boolean":
        return expr.value ? "TRUE" : "FALSE";
      case "Integer":
        return expr.value.toString();
      case "Float":
        return expr.value.toString();
      case "String":
        return `'${expr.value}'`;
      case "Reference":
        return Content.start()
          .appendSpansIf(expr.table, `${expr.table}.`)
          .concatSpans(expr.name)
          .toString();
      case "Binary":
        return Content.start()
          .appendSpan(expression2String(expr.left))
          .appendSpan(expr.operator.value)
          .appendSpan(expression2String(expr.right))
          .toString();
      case "Subquery":
        return `(${selectStm2String(expr.stmt)})`;
      case "Avg":
      case "Count":
      case "Max":
      case "Min":
      case "Sum":
      case "Total":
        return Content.start()
          .appendSpan(expr.type.toUpperCase(), "(")
          .concatSpansIf(expr.distinct, "DISTINCT", " ")
          .concatSpans(expression2String(expr.expr), ")")
          .toString();
      case "Length":
      case "Upper":
      case "Lower":
        return Content.start()
          .appendSpan(
            expr.type.toUpperCase(),
            "(",
            expression2String(expr.expr),
            ")"
          )
          .toString();
      case "Cast":
        return Content.start()
          .appendSpan("CAST", "(", expression2String(expr.expr))
          .appendSpan("AS")
          .appendSpan(expr.as.toUpperCase(), ")")
          .toString();
      case "Trim":
      case "LTrim":
      case "RTrim":
        return Content.start()
          .appendSpan(
            expr.type.toUpperCase(),
            "(",
            expression2String(expr.expr)
          )
          .concatSpansIf(expr.chars, (v) => `, ${expression2String(v)}`)
          .concatSpans(")")
          .toString();
      case "Time":
      case "Date":
        return Content.start()
          .appendSpan(
            expr.type.toUpperCase(),
            "(",
            expression2String(expr.timeValue)
          )
          .concatSpansIf(
            expr.modifiers,
            (v) => `, ${v.map((v) => `'${v}'`).join(", ")}`
          )
          .concatSpans(")")
          .toString();
      case "GroupConcat":
        return Content.start()
          .appendSpan("GROUP_CONCAT", "(", expression2String(expr.expr))
          .concatSpansIf(expr.separator, (v) => `, ${expression2String(v)}`)
          .appendSpansIf(expr.orderBy, orderBy2String)
          .concatSpans(")")
          .toString();
      case "Case":
        const content = Content.start();
        content.appendSpan("CASE");
        expr.cases.forEach(({ when, then }) => {
          content.appendParagraph(
            "WHEN",
            expression2String(when),
            "THEN",
            expression2String(then)
          );
        });
        content.appendParagraph();
        content.appendSpansIf(expr.else, "ELSE", expression2String);
        content.appendParagraph("END");
        return content.toString();
      case "In":
        return Content.start()
          .appendSpan(expression2String(expr.target))
          .appendSpansIf(expr.not, "NOT")
          .appendSpan("IN")
          .appendSpan("(", expr.values.map(expression2String).join(", "), ")")
          .toString();
      case "Between":
        return Content.start()
          .appendSpan(expression2String(expr.target))
          .appendSpansIf(expr.not, "NOT")
          .appendSpan("BETWEEN")
          .appendSpan(expression2String(expr.lowerBound))
          .appendSpan("AND")
          .appendSpan(expression2String(expr.upperBound))
          .toString();
      case "Logic":
        return Content.start()
          .appendSpan(expression2String(expr.left))
          .appendSpan(expr.key.toUpperCase())
          .appendSpan(expression2String(expr.right))
          .toString();
      case "Is":
        return Content.start()
          .appendSpan(expression2String(expr.target))
          .appendSpan("IS")
          .appendSpansIf(expr.not, "NOT")
          .appendSpan(expression2String(expr.value))
          .toString();
      case "Not":
        return Content.start()
          .appendSpan("NOT")
          .appendSpan(expression2String(expr.expr))
          .toString();
      case "Like":
        return Content.start()
          .appendSpan(expression2String(expr.target))
          .appendSpansIf(expr.not, "NOT")
          .appendSpan("LIKE")
          .appendSpan(expression2String(expr.pattern))
          .appendSpansIf(expr.escape, "ESCAPE", expression2String)
          .toString();
      case "Glob":
        return Content.start()
          .appendSpan(expression2String(expr.target))
          .appendSpansIf(expr.not, "NOT")
          .appendSpan("GLOB")
          .appendSpan(expression2String(expr.pattern))
          .toString();
    }
  };

  const content = getContent();
  return expr.priority ? `(${content})` : content;
};

const orderBy2String = (orderBy: OrderByClause[]): string => {
  const content = Content.start("ORDER BY");
  const conditions = orderBy
    .map((order) => {
      return Content.start()
        .appendSpan(expression2String(order.expr))
        .appendSpansIf(order.order, (v) => v.toUpperCase())
        .toString();
    })
    .join(", ");
  content.appendSpan(conditions);
  return content.toString();
};

const limit2String = (limit: LimitClause): string => {
  return Content.start()
    .appendSpan("LIMIT")
    .appendSpan(expression2String(limit.expr))
    .appendSpansIf(limit.offset, "OFFSET", expression2String)
    .toString();
};

const column2String = (col: Column): string => {
  return Content.start()
    .appendSpan(col.name)
    .appendSpan(col.datatype.toUpperCase())
    .appendSpansIf(col.nullable === false, "NOT NULL")
    .appendSpansIf(col.primary, "PRIMARY KEY")
    .appendSpansIf(col.default, "DEFAULT", expression2String)
    .toString();
};

class Content {
  private _paragraphs: string[][];
  private _lastParagraph: string[];

  constructor(str: string) {
    const first = [str];
    this._paragraphs = [first];
    this._lastParagraph = first;
  }

  static start(str?: string) {
    return new Content(str ?? "");
  }

  appendParagraph(...spans: string[]) {
    this._paragraphs.push(spans);
    this._lastParagraph = spans;
    return this;
  }

  appendSpan(...spans: string[]) {
    this._lastParagraph.push(spans.join(""));
    return this;
  }

  concatSpans(...spans: string[]) {
    this._lastParagraph[this._lastParagraph.length - 1] += spans.join("");
    return this;
  }

  appendSpansIf<T>(
    value: T,
    ...spans: (string | ((value: NonNullable<T>) => string))[]
  ) {
    if (value) {
      spans.forEach((span) => {
        if (typeof span === "function") {
          this._lastParagraph.push(span(value));
        } else {
          this._lastParagraph.push(span);
        }
      });
    }
    return this;
  }

  concatSpansIf<T>(
    value: T,
    ...spans: (string | ((value: NonNullable<T>) => string))[]
  ) {
    if (value) {
      let spanStr = "";
      spans.forEach((span) => {
        if (typeof span === "function") {
          spanStr += span(value);
        } else {
          spanStr += span;
        }
      });
      this._lastParagraph[this._lastParagraph.length - 1] += spanStr;
    }
    return this;
  }

  toString() {
    return this._paragraphs
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph) => paragraph.filter((span) => span !== "").join(" "))
      .join("\n")
      .trim();
  }
}
