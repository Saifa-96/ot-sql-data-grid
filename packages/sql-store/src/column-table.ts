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
      { name: "name", type: "TEXT" },
      { name: "display_name", type: "TEXT" },
      { name: "width", type: "INTEGER" },
      { name: "order_by", type: "INTEGER" },
    ]);
  }

  addColumnSettings(
    columns: {
      id: string;
      name: string;
      width: number;
      displayName: string;
      orderBy: number;
    }[]
  ) {
    insertRows(
      this.db,
      this.tableName,
      ["id", "name", "width", "display_name", "order_by"],
      columns.map((column) => [
        column.id,
        column.name,
        column.width,
        column.displayName,
        column.orderBy,
      ])
    );
  }

  deleteColumnItem(id: string) {
    deleteRows(this.db, this.tableName, "name", [id]);
  }

  updateDisplayName(id: string, displayName: string) {
    updateCell(this.db, this.tableName, "id", id, "display_name", displayName);
  }

  updateOrderBy(id: string, orderBy: number) {
    updateCell(this.db, this.tableName, "id", id, "order_by", orderBy);
  }

  getColumnSettings() {
    return queryAllRows(this.db, this.tableName).map((row) => transform(row));
  }

  getColumnNames() {
    return this.getColumnSettings()
      .map((row) => row.name)
      .filter((name) => name !== "id");
  }
}

const rowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    width: z.number(),
    order_by: z.number(),
    display_name: z.string(),
  })
  .strip();

const transform = rowSchema.transform((row) => ({
  id: row.id,
  name: row.name,
  width: row.width,
  displayName: row.display_name,
  orderBy: row.order_by,
})).parse;

export default ColumnTable;
