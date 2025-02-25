import { Database } from "sql.js";
import {
  createTable,
  deleteRows,
  insertRows,
  queryAllRows,
  updateCell,
} from "./sql-utils";
import { z } from "zod";

class ColumnTable {
  private db: Database;
  private tableName = "columns";

  constructor(db: Database) {
    this.db = db;
  }

  createTable() {
    createTable(this.db, this.tableName, [
      { fieldName: "field_name", type: "TEXT" },
      { fieldName: "display_name", type: "TEXT" },
      { fieldName: "width", type: "INTEGER" },
      { fieldName: "order_by", type: "INTEGER" },
    ]);
  }

  addColumnSettings(
    columns: {
      id: string;
      fieldName: string;
      width: number;
      displayName: string;
      orderBy: number;
    }[]
  ) {
    insertRows(
      this.db,
      this.tableName,
      ["id", "field_name", "width", "display_name", "order_by"],
      columns.map((column) => [
        column.id,
        column.fieldName,
        column.width,
        column.displayName,
        column.orderBy,
      ])
    );
  }

  deleteColumnItem(id: string) {
    deleteRows(this.db, this.tableName, "field_name", [id]);
  }

  updateDisplayName(id: string, displayName: string) {
    updateCell(this.db, this.tableName, "id", id, "display_name", displayName);
  }

  updateOrderBy(id: string, orderBy: number) {
    updateCell(this.db, this.tableName, "id", id, "order_by", orderBy);
  }

  getColumnSettings() {
    const rows = queryAllRows(this.db, this.tableName)
    return rows.map((row) => transform(row));
  }

  getColumnNames() {
    return this.getColumnSettings()
      .map((row) => row.fieldName)
      .filter((name) => name !== "id");
  }
}

const rowSchema = z
  .object({
    id: z.string(),
    field_name: z.string(),
    width: z.number(),
    order_by: z.number(),
    display_name: z.string(),
  })
  .strip();

const transform = rowSchema.transform((row) => ({
  id: row.id,
  fieldName: row.field_name,
  width: row.width,
  displayName: row.display_name,
  orderBy: row.order_by,
})).parse;

export default ColumnTable;
