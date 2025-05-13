import io from "@/utils/io";
import {
  DeleteStatement,
  Expression,
  InsertStatement,
  SelectStatement,
  SQL,
  Statement,
  UpdateStatement,
} from "sql-parser";
import { COLUMN_TABLE_NAME, DATA_TABLE_NAME } from "sql-store";
import { match, P } from "ts-pattern";

export interface Task {
  preview: SelectStatement;
  action: DeleteStatement | UpdateStatement | InsertStatement;
}

const transformToTasks = io.from<SQL, Task[]>((sql) => {
  if (sql.type === "transaction") {
    const tasks: Task[] = [];
    for (const stmt of sql.stmts) {
      if (stmt.type === "select") continue;
      const result = transformStatement(stmt);
      if (result.type === "err") {
        return result;
      }
      tasks.push(result.data);
    }
    return io.ok(tasks);
  }

  const result = transformStatement(sql);
  return io.map(result, (task) => [task]);
});

export default transformToTasks;

const transformStatement = io.from<Statement, Task>((stmt) => {
  switch (stmt.type) {
    case "create-table":
    case "alter":
    case "select":
      return io.err("Not allowed to use alter/select/create-table statement");
    case "delete":
      return transformDeleteStmt(stmt);
    case "update":
      return transformUpdateStmt(stmt);
    case "insert":
      return transformInsertStmt(stmt);
  }
});

const transformDeleteStmt = io.from<DeleteStatement, Task>((stmt) =>
  match(stmt)
    .with({ tableName: unknownTableNamePattern }, ({ tableName }) =>
      io.err(unknownTableNameMsg(tableName, "delete statement"))
    )
    .with({ where: P.nullish }, () =>
      io.err("Delete statement must have where clause")
    )
    .otherwise(({ tableName, where }) => {
      const name = tableName === COLUMN_TABLE_NAME ? "field_name" : "id";
      const expr: Expression = { type: "Reference", name };
      const preview: SelectStatement = {
        type: "select",
        table: { type: "table-name", name: tableName },
        columns: [{ expr }],
        where,
      };
      return io.ok({
        action: stmt,
        preview,
      });
    })
);

const transformInsertStmt = io.from<InsertStatement, Task>((stmt) =>
  match(stmt)
    .with({ tableName: unknownTableNamePattern }, ({ tableName }) =>
      io.err(unknownTableNameMsg(tableName, "insert statement"))
    )
    .with({ columns: P.nullish }, () =>
      io.err("Insert statement must have columns")
    )
    .with({ select: { columns: "*" } }, () =>
      io.err('"insert" statement select must have columns')
    )
    .with(
      { values: P.nonNullable, columns: P.nonNullable },
      ({ columns, values }) => {
        const [first, ...rest] = values;
        const selectColumns = columns.map((column, index) => ({
          expr: first[index],
          alias: column,
        }));
        const preview: SelectStatement = {
          type: "select",
          columns: selectColumns,
          unionAll: rest,
        };
        return io.ok({
          action: stmt,
          preview,
        });
      }
    )
    .with(
      { select: { columns: P.not("*") }, columns: P.nonNullable },
      ({ select, columns }) => {
        const selectColumns = select.columns.map((column, index) => ({
          ...column,
          alias: columns[index],
        }));
        const preview: SelectStatement = {
          ...select,
          columns: selectColumns,
        };
        return io.ok({
          action: stmt,
          preview,
        });
      }
    )
    .otherwise(() => {
      return io.err("Insert statement must have values");
    })
);

const transformUpdateStmt = io.from<UpdateStatement, Task>((stmt) =>
  match(stmt)
    .with({ tableName: unknownTableNamePattern }, ({ tableName }) =>
      io.err(unknownTableNameMsg(tableName, "update statement"))
    )
    .otherwise(({ tableName }) => {
      const columns = stmt.set.map(({ column, value }) => ({
        expr: value,
        alias: column,
      }));
      columns.unshift({
        expr: { type: "Reference", name: "id" },
        alias: "id",
      });
      const preview: SelectStatement = {
        type: "select",
        table: { type: "table-name", name: tableName },
        columns,
        where: stmt.where,
      };
      return io.ok({
        action: stmt,
        preview,
      });
    })
);

const unknownTableNamePattern = P.not(
  P.union(DATA_TABLE_NAME, COLUMN_TABLE_NAME)
);
const unknownTableNameMsg = (name: string, stmt: string) =>
  `Unknown table name '${name}' is found in ${stmt}, only '${COLUMN_TABLE_NAME}' and '${DATA_TABLE_NAME}' are allowed`;
