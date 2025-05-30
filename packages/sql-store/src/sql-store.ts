import {
  ColumnChanges,
  identityToString,
  Operation,
} from "operational-transformation";
import {
  astToString,
  DataType,
  OrderByClause,
  UpdateStatement,
} from "sql-parser";
import { Database, SqlValue } from "sql.js";
import {
  INIT_COLUMN_TABLE_SQL,
  INIT_DATA_TABLE_SQL,
  columnItemSchema,
  columnSettingsSchema,
  COLUMN_TABLE_HEADER,
  COLUMN_VALUES_PLACEHOLDER,
  TableSettings,
  COLUMN_TABLE_NAME,
  DATA_TABLE_NAME,
} from "./constants";

export type Row = (string | number | null)[];

export class SQLStore {
  readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  init(
    columns: ColumnChanges[],
    ids: string[],
    values: Row[]
  ): { type: "success" } | { type: "failed"; err: Error } {
    try {
      // 1. Init columns table.
      this.db.exec(INIT_COLUMN_TABLE_SQL);

      // 2. Init data table.
      this.db.exec(INIT_DATA_TABLE_SQL);

      // 3. Insert data into tables.
      return this.execOperation({
        insertColumns: Object.fromEntries(
          columns.map((col) => [col.fieldName, col])
        ),
        insertRecords: [
          {
            ids: ids.map((i) => ({ uuid: i })),
            columns: columns.map((col) => col.fieldName),
            values,
          },
        ],
      });
    } catch (error) {
      return { type: "failed", err: error as Error };
    }
  }

  getTableMetadata(tableName: string): TableSettings {
    const header: TableSettings = [];
    const stmt = this.db.prepare(`PRAGMA table_info(${tableName})`);
    while (stmt.step()) {
      const colData = stmt.getAsObject();
      const { success, data, error } = columnSettingsSchema.safeParse(colData);
      if (success) {
        header.push(data);
      } else {
        console.error("Error parsing column data:", error, colData);
      }
    }
    stmt.free();
    return header;
  }

  getRecordTotalCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) FROM ${DATA_TABLE_NAME}`);
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return Number(result["COUNT(*)"]);
  }

  getColumns(): ColumnChanges[] {
    const stmt = this.db.prepare(`SELECT * FROM ${COLUMN_TABLE_NAME}`);
    const rows: ColumnChanges[] = [];
    while (stmt.step()) {
      const obj = stmt.getAsObject();
      const { success, data, error } = columnItemSchema.safeParse(obj);
      if (success) {
        rows.push(data);
      } else {
        console.error("Error parsing column item in SQLStore:", error, obj);
      }
    }
    stmt.free();
    return rows;
  }

  getColumnNameSet(): Set<string> {
    const columns = this.getColumns();
    return new Set(columns.map((col) => col.fieldName));
  }

  getRecordsByPage(
    page: number,
    size: number,
    orderBy?: OrderByClause
  ): Record<string, SqlValue>[] {
    const offset = (page - 1) * size;
    const dql = astToString({
      type: "select",
      columns: "*",
      from: [{ type: "table-name", name: DATA_TABLE_NAME }],
      limit: {
        expr: { type: "Integer", value: size },
        offset: { type: "Integer", value: offset },
      },
      orderBy: [
        orderBy ?? {
          expr: { type: "Reference", name: "create_time" },
          order: "desc",
        },
      ],
    });

    const stmt = this.db.prepare(dql);
    const rows: Record<string, SqlValue>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  execOperation(
    op: Operation
  ): { type: "success" } | { type: "failed"; err: Error } {
    try {
      this.db.exec("BEGIN TRANSACTION;");
      this.runInsertColumns(op.insertColumns);
      this.runUpdateColumns(op.updateColumns);
      this.runInsertRecords(op.insertRecords);
      this.runUpdateRecords(op.updateRecords);
      this.runDeleteRecords(op.deleteRecords);
      this.runDeleteColumns(op.deleteColumns);

      this.db.exec("COMMIT;");
      return { type: "success" };
    } catch (e) {
      this.db.exec("ROLLBACK;");
      const err = e instanceof Error ? e : new Error("Unknown error");
      return { type: "failed", err };
    }
  }

  private runInsertColumns(insertColumns: Operation["insertColumns"]) {
    if (!insertColumns) return;

    const dml = astToString({
      type: "insert",
      tableName: COLUMN_TABLE_NAME,
      columns: COLUMN_TABLE_HEADER,
      values: [COLUMN_VALUES_PLACEHOLDER],
    });

    const ddl = (name: string) =>
      astToString({
        type: "alter",
        action: "add",
        tableName: DATA_TABLE_NAME,
        column: {
          name,
          datatype: DataType.String,
          primary: false,
        },
      });

    for (const column of Object.values(insertColumns)) {
      this.db.exec(dml, to$obj(column));
      this.db.exec(ddl(column.fieldName));
    }
  }

  private runUpdateColumns(updateColumns: Operation["updateColumns"]) {
    if (!updateColumns) return;
    const colNameSet = this.getColumnNameSet();

    const updateStmt: UpdateStatement = {
      type: "update",
      tableName: COLUMN_TABLE_NAME,
      set: [],
      where: {
        not: false,
        expr: {
          type: "Binary",
          left: { type: "Reference", name: "field_name" },
          operator: { type: "Equals", value: "=" },
          right: { type: "Reference", name: "?" },
        },
      },
    };

    const setValues: UpdateStatement["set"] = [];
    for (const [fieldName, changes] of Object.entries(updateColumns)) {
      if (!colNameSet.has(fieldName)) {
        throw new Error(`[Update Columns] Column "${fieldName}" does not exist in the table.`);
      }
      if (changes.width) {
        setValues.push({
          column: "width",
          value: { type: "Integer", value: changes.width },
        });
      }
      if (changes.displayName) {
        setValues.push({
          column: "display_name",
          value: { type: "String", value: changes.displayName },
        });
      }
      if (changes.orderBy) {
        setValues.push({
          column: "order_by",
          value: { type: "Integer", value: changes.orderBy },
        });
      }

      updateStmt.set = setValues;
      this.db.exec(astToString(updateStmt), [fieldName]);
    }
  }

  private runDeleteColumns(deleteColumns: Operation["deleteColumns"]) {
    if (!deleteColumns) return;
    const dml = astToString({
      type: "delete",
      tableName: COLUMN_TABLE_NAME,
      where: {
        not: false,
        expr: {
          type: "In",
          target: { type: "Reference", name: "field_name" },
          values: deleteColumns.map((col) => ({ type: "String", value: col })),
        },
      },
    });
    this.db.exec(dml);

    const ddl = (name: string) =>
      astToString({
        type: "alter",
        action: "drop",
        tableName: DATA_TABLE_NAME,
        columnName: name,
      });
    for (const columnName of deleteColumns) {
      this.db.exec(ddl(columnName));
    }
  }

  private runInsertRecords(insertRecords: Operation["insertRecords"]) {
    if (!insertRecords) return;

    for (const { ids, columns, values } of insertRecords) {
      const allColumns = ["id", ...columns];
      const dml = astToString({
        type: "insert",
        tableName: DATA_TABLE_NAME,
        columns: allColumns,
        values: [allColumns.map(() => ({ type: "Reference", name: "?" }))],
      });
      const stmt = this.db.prepare(dml);
      try {
        values.forEach((row, index) => {
          stmt.run([identityToString(ids[index]), ...row]);
        });
      } finally {
        stmt.free();
      }
    }
  }

  private runUpdateRecords(updateRecords: Operation["updateRecords"]) {
    if (!updateRecords) return;

    for (const { ids, columns, values } of updateRecords) {
      const dml = astToString({
        type: "update",
        tableName: DATA_TABLE_NAME,
        set: columns.map((col) => ({
          column: col,
          value: { type: "Reference", name: "?" },
        })),
        where: {
          not: false,
          expr: {
            type: "Binary",
            left: { type: "Reference", name: "id" },
            operator: { type: "Equals", value: "=" },
            right: { type: "Reference", name: "?" },
          },
        },
      });
      const stmt = this.db.prepare(dml);
      values.forEach((row, index) => {
        stmt.run([...row, identityToString(ids[index])]);
      });
    }
  }

  private runDeleteRecords(deleteRecords: Operation["deleteRecords"]) {
    if (!deleteRecords) return;

    const dml = astToString({
      type: "delete",
      tableName: DATA_TABLE_NAME,
      where: {
        not: false,
        expr: {
          type: "Binary",
          left: { type: "Reference", name: "id" },
          operator: { type: "Equals", value: "=" },
          right: { type: "Reference", name: "?" },
        },
      },
    });
    for (const id of deleteRecords) {
      this.db.exec(dml, [identityToString(id)]);
    }
  }
}

const to$obj = (obj: object) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => ["$" + key, value])
  );
};
