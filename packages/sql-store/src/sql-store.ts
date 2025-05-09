import { identityToString, Operation } from "operational-transformation";
import { Column, DataType, sql2String, UpdateStatement } from "sql-parser";
import { Database, SqlValue } from "sql.js";
import { z } from "zod";

export const DATA_TABLE_NAME = "main_data";
export const COLUMN_TABLE_NAME = "columns";

export type Row = (string | number | null)[];

export class SQLStore {
  static columnTableHeader = [
    "field_name",
    "display_name",
    "width",
    "order_by",
  ];
  readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  init(columns: ColumnItem[], ids: string[], values: Row[]) {
    // 1. init columns table
    this.db.exec(_initColumnTableSQL);
    this.insertRows(
      COLUMN_TABLE_NAME,
      ["field_name", "display_name", "width", "order_by"],
      columns.map((col) => [
        col.fieldName,
        col.displayName,
        col.width,
        col.orderBy,
      ])
    );

    // 2. int data table
    this.db.exec(
      _initDataTableSQL(
        columns.map((col) => ({
          name: col.fieldName,
          datatype: DataType.String,
          primary: false,
        }))
      )
    );
    this.insertRecords(
      ids,
      columns.map((col) => col.fieldName),
      values
    );
  }

  private insertRows(
    tableName: string,
    columns: string[],
    values: Row[]
  ): boolean {
    try {
      this.db.exec("BEGIN TRANSACTION;");
      const stmt = this.db.prepare(
        `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${columns
          .map(() => "?")
          .join(", ")})`
      );

      values.forEach((row) => {
        stmt.run(row);
      });

      stmt.free();
      this.db.exec("COMMIT;");
      return true;
    } catch (error) {
      console.error("Error inserting rows:", error);
      this.db.exec("ROLLBACK;");
      return false;
    }
  }

  private getTableSettings(tableName: string): TableSettings {
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

  getSettings() {
    const columnTable = this.getTableSettings(COLUMN_TABLE_NAME);
    const dataTable = this.getTableSettings(DATA_TABLE_NAME);
    return {
      columnTableName: COLUMN_TABLE_NAME,
      dataTableName: DATA_TABLE_NAME,
      columnTable,
      dataTable,
    };
  }

  getRecordTotalCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) FROM ${DATA_TABLE_NAME}`);
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return Number(result["COUNT(*)"]);
  }

  getColumns(): ColumnItem[] {
    const stmt = this.db.prepare(`SELECT * FROM ${COLUMN_TABLE_NAME}`);
    const rows: ColumnItem[] = [];
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

  getRecordsByPage(
    page: number,
    size: number,
    orderBy: string = "create_time DESC"
  ): Record<string, SqlValue>[] {
    const offset = (page - 1) * size;
    let sql = `SELECT * FROM ${DATA_TABLE_NAME}`;
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    sql += ` LIMIT ${size} OFFSET ${offset}`;

    const stmt = this.db.prepare(sql);
    const rows: Record<string, SqlValue>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  insertRecords(
    ids: string[],
    columns: string[],
    values: (string | number | null)[][]
  ): boolean {
    return this.insertRows(
      DATA_TABLE_NAME,
      ["id", ...columns],
      values.map((row, index) => [ids[index], ...row])
    );
  }

  deleteRecords(ids: string[]): boolean {
    try {
      this.db.run(
        sql2String({
          type: "delete",
          tableName: DATA_TABLE_NAME,
          where: {
            isNot: false,
            type: "In",
            target: { type: "Reference", name: "id" },
            values: ids.map((id) => ({ type: "String", value: id })),
          },
        })
      );
      return true;
    } catch (error) {
      console.error("Error deleting records:", error);
      return false;
    }
  }

  updateRecords(
    columns: string[],
    values: (string | number | null)[][]
  ): boolean {
    try {
      this.db.exec("BEGIN TRANSACTION;");
      const [idColumn, ...updateColumns] = columns;

      const stmt = this.db.prepare(
        `UPDATE ${DATA_TABLE_NAME} SET ${updateColumns
          .map((col) => `${col} = ?`)
          .join(", ")} WHERE ${idColumn} = ?`
      );

      values.forEach((row) => {
        const [id, ...values] = row;
        stmt.run([...values, id]);
      });

      stmt.free();
      this.db.exec("COMMIT;");
      return true;
    } catch (error) {
      this.db.exec("ROLLBACK;");
      console.error("Error updating records:", error);
      return false;
    }
  }

  addColumns(columnItems: ColumnItem[]): boolean {
    const settings = this.getTableSettings(DATA_TABLE_NAME);
    const curtColumnNames = settings.map((col) => col.name);
    if (columnItems.some((col) => curtColumnNames.includes(col.fieldName))) {
      return false;
    }

    try {
      this.db.exec("BEGIN TRANSACTION;");
      columnItems.forEach((columnItem) => {
        this.db.run(
          sql2String({
            type: "alter",
            action: "add",
            tableName: DATA_TABLE_NAME,
            column: {
              primary: false,
              name: columnItem.fieldName,
              datatype: DataType.String,
            },
          })
        );
      });
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      console.error("Error adding columns:", error);
      return false;
    }

    return this.insertRows(
      COLUMN_TABLE_NAME,
      SQLStore.columnTableHeader,
      columnItems.map((col) => [
        col.fieldName,
        col.displayName,
        col.width,
        col.orderBy,
      ])
    );
  }

  dropColumns(columnNames: string[]): boolean {
    const settings = this.getTableSettings(DATA_TABLE_NAME);
    const curtColumnNames = settings.map((col) => col.name);
    if (!columnNames.every((col) => curtColumnNames.includes(col)))
      return false;

    try {
      this.db.exec("BEGIN TRANSACTION;");
      this.db.run(
        sql2String({
          type: "delete",
          tableName: COLUMN_TABLE_NAME,
          where: {
            isNot: false,
            type: "In",
            target: { type: "Reference", name: "field_name" },
            values: columnNames.map((col) => ({ type: "String", value: col })),
          },
        })
      );
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      console.error("Error dropping columns:", error);
      return false;
    }

    try {
      this.db.exec("BEGIN TRANSACTION;");
      columnNames.forEach((columnName) => {
        this.db.run(
          sql2String({
            type: "alter",
            action: "drop",
            tableName: DATA_TABLE_NAME,
            columnName,
          })
        );
      });
      this.db.exec("COMMIT;");
      return true;
    } catch (error) {
      this.db.exec("ROLLBACK;");
      console.error("Error dropping columns:", error);
      return false;
    }
  }

  updateColumns(
    columnNames: string[],
    columnItems: Partial<Omit<ColumnItem, "fieldName">>[]
  ): boolean {
    const settings = this.getTableSettings(DATA_TABLE_NAME);
    const curtColumnNames = settings.map((col) => col.name);
    if (!columnNames.every((col) => curtColumnNames.includes(col))) {
      return false;
    }

    try {
      this.db.exec("BEGIN TRANSACTION;");
      columnItems.forEach((columnItem, index) => {
        const setValues: UpdateStatement["set"] = [];
        if (columnItem.width) {
          setValues.push({
            column: "width",
            value: { type: "Integer", value: columnItem.width },
          });
        }
        if (columnItem.displayName) {
          setValues.push({
            column: "display_name",
            value: { type: "String", value: columnItem.displayName },
          });
        }
        if (columnItem.orderBy) {
          setValues.push({
            column: "order_by",
            value: {
              type: "Integer",
              value: columnItem.orderBy,
            },
          });
        }

        this.db.run(
          sql2String({
            type: "update",
            tableName: COLUMN_TABLE_NAME,
            set: setValues,
            where: {
              type: "Expression",
              isNot: false,
              expr: {
                type: "OperatorExpression",
                left: { type: "Reference", name: "field_name" },
                operator: { type: "Equals", value: "=" },
                right: { type: "String", value: columnNames[index] },
              },
            },
          })
        );
      });
      this.db.exec("COMMIT;");
      return true;
    } catch (error) {
      this.db.exec("ROLLBACK;");
      console.error("Error updating columns:", error);
      return false;
    }
  }

  // TODO Rollback strategy.
  execOperation({
    insertColumns,
    deleteColumns,
    updateColumns,
    insertRecords,
    deleteRecords,
    updateRecords,
  }: Operation) {
    if (insertColumns) {
      const params = Object.values(insertColumns).map((item) => ({
        fieldName: item.name,
        width: item.width,
        displayName: item.displayName,
        orderBy: item.orderBy,
      }));
      this.addColumns(params);
    }

    if (updateColumns) {
      const keys = Object.keys(updateColumns);
      const values = Object.values(updateColumns).map((item) => ({
        width: item.width,
        displayName: item.displayName,
        orderBy: item.orderBy,
      }));
      this.updateColumns(keys, values);
    }

    if (insertRecords) {
      try {
        this.db.exec("BEGIN TRANSACTION;");

        for (const { ids, columns, values } of insertRecords) {
          const allColumns = ["id", ...columns];
          const stmt = this.db.prepare(
            `INSERT INTO ${DATA_TABLE_NAME} (${allColumns.join(
              ", "
            )}) VALUES (${allColumns.map(() => "?").join(", ")})`
          );

          values.forEach((row, index) => {
            stmt.run([identityToString(ids[index]), ...row]);
          });

          stmt.free();
        }
        this.db.exec("COMMIT;");
      } catch (error) {
        this.db.exec("ROLLBACK;");
        return false;
      }
    }

    if (deleteRecords) {
      this.deleteRecords(deleteRecords.map(identityToString));
    }

    if (updateRecords) {
      try {
        this.db.exec("BEGIN TRANSACTION;");

        for (const { ids, columns, values } of updateRecords) {
          const stmt = this.db.prepare(
            `UPDATE ${DATA_TABLE_NAME} SET ${columns
              .map((col) => `${col} = ?`)
              .join(", ")} WHERE id = ?`
          );

          values.forEach((row, index) => {
            stmt.run([...row, identityToString(ids[index])]);
          });

          stmt.free();
        }
        this.db.exec("COMMIT;");
      } catch (error) {
        this.db.exec("ROLLBACK;");
        return false;
      }
    }

    if (deleteColumns) {
      this.dropColumns(deleteColumns);
    }
  }
}

const _initColumnTableSQL = sql2String({
  type: "create-table",
  name: COLUMN_TABLE_NAME,
  columns: [
    {
      name: "field_name",
      datatype: DataType.String,
      nullable: false,
      primary: true,
    },
    {
      name: "display_name",
      datatype: DataType.String,
      nullable: false,
      primary: false,
    },
    {
      name: "width",
      datatype: DataType.Integer,
      nullable: false,
      primary: false,
    },
    {
      name: "order_by",
      datatype: DataType.Integer,
      nullable: false,
      primary: false,
    },
  ],
});

const _initDataTableSQL = (columns: Column[]) =>
  sql2String({
    type: "create-table",
    name: DATA_TABLE_NAME,
    columns: [
      {
        name: "id",
        datatype: DataType.String,
        nullable: false,
        primary: true,
      },
      ...columns,
      {
        name: "create_time",
        datatype: DataType.Datetime,
        nullable: false,
        primary: false,
        default: { type: "Current_Timestamp" },
      },
    ],
  });

export type ColumnItem = z.infer<typeof columnItemSchema>;
const columnItemSchema = z
  .object({
    field_name: z.string(),
    display_name: z.union([z.string(), z.number()]),
    width: z.number(),
    order_by: z.number(),
  })
  .strip()
  .transform((row) => ({
    fieldName: String(row.field_name),
    // TODO the field will be implicitly transform to number if the value is '123'.
    displayName: String(row.display_name),
    width: row.width,
    orderBy: row.order_by,
  }));

const columnSettingsSchema = z
  .object({
    cid: z.number(),
    name: z.string(),
    type: z.enum([
      "STRING",
      "TEXT",
      "INTEGER",
      "REAL",
      "BLOB",
      "NULL",
      "DATETIME",
    ]),
    notnull: z.number(),
    dflt_value: z.string().nullable(),
    pk: z.number(),
  })
  .transform((data) => ({
    cid: data.cid,
    name: data.name,
    type: data.type,
    nullable: data.notnull === 0,
    defaultValue: data.dflt_value,
    primaryKey: data.pk === 1,
  }));

export type TableSettings = z.infer<typeof columnSettingsSchema>[];
