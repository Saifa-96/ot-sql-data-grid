import {
  ColumnChanges,
  Operation,
  RecordChanges,
} from "operational-transformation";
import {
  DeleteStatement,
  InsertStatement,
  SelectStatement,
  SQL,
  Statement,
  UpdateStatement,
} from "sql-parser";
import { QueryExecResult } from "sql.js";
import { match, P } from "ts-pattern";
import { v4 as uuid } from "uuid";

export const parseSQL = (sql: SQL): ParseResult => {
  if (sql.type === "transaction") {
    const tasks: Task[] = [];
    for (const stmt of sql.stmts) {
      const result = parseStatement(stmt);
      if (result.type === "err") {
        return result;
      }
      tasks.push(...result.tasks);
    }
    return { type: "success", tasks };
  } else {
    return parseStatement(sql);
  }
};

const parseStatement = (stmt: Statement): ParseResult => {
  return match(stmt)
    .returnType<ParseResult>()
    .with({ type: P.union("alter", "create-table", "select") }, () =>
      err("不允许单独使用alter/select/create-table语句")
    )
    .with({ type: "update", tableName: "columns" }, () =>
      err("不允许使用update语句修改columns表")
    )
    .with(
      {
        type: "delete",
        tableName: "columns",
        where: P.nullish,
      },
      () => err("使用delete语句修改columns表时，必须有where条件")
    )
    .with({ type: "delete" }, (stmt) => ({
      type: "success",
      tasks: [
        {
          action: stmt,
          preview: deleteStmtToSelectStmt(stmt),
        },
      ],
    }))
    .with({ type: "update" }, (stmt) => ({
      type: "success",
      tasks: [
        {
          action: stmt,
          preview: updateStmtToSelectStmt(stmt),
        },
      ],
    }))
    .with(
      { type: "insert", tableName: "main_data", values: P.nonNullable },
      (stmt) => {
        const newStmt = { ...stmt };
        if (!newStmt.columns) {
          return err('"insert" statement must have columns');
        }
        const idIndex = newStmt.columns.indexOf("id");
        if (idIndex !== -1) {
          newStmt.values = newStmt.values.map((row) => {
            const newRow = [...row];
            newRow[idIndex] = { type: "String", value: uuid() };
            return newRow;
          });
        } else {
          newStmt.values = newStmt.values.map((row) => {
            const newRow = [...row];
            newRow.unshift({ type: "String", value: uuid() });
            return newRow;
          });
          newStmt.columns.unshift("id");
        }
        return {
          type: "success",
          tasks: [
            {
              action: newStmt,
              preview: insertStmtToSelectStmt(newStmt),
            },
          ],
        };
      }
    )
    .with(
      { type: "insert", tableName: "main_data", select: P.nonNullable },
      (stmt) => {
        return {
          type: "success",
          tasks: [
            {
              action: stmt,
              preview: stmt.select,
            },
          ],
        };
      }
    )
    .with({ type: "insert", tableName: "columns" }, (stmt) => {
      return {
        type: "success",
        tasks: [
          {
            action: stmt,
            preview: insertStmtToSelectStmt(stmt),
          },
        ],
      };
    })
    .with({ type: "insert" }, () => {
      return err("不允许使用insert语句修改除main_data和columns表以外的表");
    })
    .exhaustive();
};

export type Task =
  | { action: DeleteStatement; preview: SelectStatement }
  | { action: UpdateStatement; preview: SelectStatement }
  | { action: InsertStatement; preview: SelectStatement };

type ParseResult =
  | { type: "success"; tasks: Task[] }
  | { type: "err"; msg: string };

const err = (msg: string) => {
  return {
    type: "err",
    msg,
  } as const;
};

const updateStmtToSelectStmt = (stmt: UpdateStatement): SelectStatement => {
  const columns = stmt.set.map(({ column, value }) => ({
    expr: value,
    alias: column,
  }));
  columns.unshift({
    expr: { type: "Reference", name: "id" },
    alias: "id",
  });
  return {
    type: "select",
    table: { type: "table-name", name: stmt.tableName },
    columns,
    where: stmt.where,
  };
};

const insertStmtToSelectStmt = (stmt: InsertStatement): SelectStatement => {
  if (!stmt.columns) {
    throw new Error('"insert" statement must have columns');
  }

  if (stmt.values) {
    const [first, ...rest] = stmt.values;
    const columns = stmt.columns.map((column, index) => ({
      expr: first[index],
      alias: column,
    }));

    return {
      type: "select",
      columns,
      unionAll: rest,
    };
  } else {
    if (stmt.select?.columns === "*") {
      throw new Error('"insert" statement select must have columns');
    }
    return {
      ...stmt.select!,
      columns: stmt.select!.columns.map((column, index) => ({
        ...column,
        alias: stmt.columns?.[index],
      })),
    };
  }
};

const deleteStmtToSelectStmt = (stmt: DeleteStatement): SelectStatement => {
  const { tableName } = stmt;
  return {
    type: "select",
    table: { type: "table-name", name: tableName },
    columns: [
      {
        expr: {
          type: "Reference",
          name: tableName === "columns" ? "field_name" : "id",
        },
      },
    ],
    where: stmt.where,
  };
};

export const updateOperation = (queryResult: QueryExecResult): Operation => {
  const { columns, values } = queryResult;
  if (!columns.includes("id")) {
    throw new Error(`"update" statement result must have "id" column`);
  }
  const idIndex = columns.indexOf("id");
  const newColumns = columns.filter((column) => column !== "id");
  const changes = values.reduce<RecordChanges>(
    (c, row) => {
      const rowValues = [...row];
      rowValues.splice(idIndex, 1);
      const values = rowValues.map((value) => value?.toString() ?? "");
      const id = row[idIndex]?.toString() ?? "";
      c.ids.push({ uuid: id });
      c.values.push(values);
      return c;
    },
    {
      ids: [],
      columns: newColumns,
      values: [],
    }
  );
  return {
    updateRecords: [changes],
  };
};

export const deleteRowsOperation = (
  queryResult: QueryExecResult
): Operation => {
  const { columns, values } = queryResult;
  if (!columns.includes("id")) {
    throw new Error(`"delete" statement result must have "id" column`);
  }
  const keyIndex = columns.indexOf("id");
  return {
    deleteRecords: values.map((row) => ({
      uuid: row[keyIndex]?.toString() ?? "",
    })),
  };
};

export const deleteColsOperation = (
  queryResult: QueryExecResult
): Operation => {
  const { columns, values } = queryResult;
  if (!columns.includes("field_name")) {
    throw new Error(`"delete" statement result must have "field_name" column`);
  }
  const keyIndex = columns.indexOf("field_name");
  return {
    deleteColumns: values.map((row) => row[keyIndex]?.toString() ?? ""),
  };
};

export const insertColsOperation = (
  queryResult: QueryExecResult
): Operation => {
  const { columns, values } = queryResult;
  if (!validateColumnsChange(columns)) {
    throw new Error(`"insert" statement result must have "field_name" column`);
  }

  const indexRecord = columns.reduce<Record<string, number>>(
    (acc, column, index) => {
      acc[column] = index;
      return acc;
    },
    {}
  );

  return {
    insertColumns: values.reduce<Record<string, ColumnChanges>>(
      (record, row) => {
        const fieldName = row[indexRecord["field_name"]] as string;
        const displayName = row[indexRecord["display_name"]] as string;
        const width = row[indexRecord["width"]] as number;
        const orderBy = row[indexRecord["order_by"]] as number;

        record[fieldName] = {
          name: fieldName,
          displayName,
          width,
          orderBy,
        };

        // record[item]
        return record;
      },
      {}
    ),
  };
};

export const insertRowsOperation = (
  queryResult: QueryExecResult
): Operation => {
  const { columns, values } = queryResult;
  if (!columns.includes("id")) {
    throw new Error(`"insert" statement result must have "id" column`);
  }
  const idIndex = columns.indexOf("id");
  const changes = values.reduce<RecordChanges>(
    (changes, row) => {
      const rowValues = row.map((value) => value?.toString() ?? "");
      const id = rowValues.splice(idIndex, 1)[0];
      changes.ids.push({ symbol: id });
      changes.values.push(rowValues);
      return changes;
    },
    {
      ids: [],
      columns: columns.filter((column) => column !== "id"),
      values: [],
    }
  );
  return {
    insertRecords: [changes],
  };
};

const validateColumnsChange = (columns: string[]) => {
  return (
    columns.length === 4 &&
    columns.includes("field_name") &&
    columns.includes("display_name") &&
    columns.includes("width") &&
    columns.includes("order_by")
  );
};
