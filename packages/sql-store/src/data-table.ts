import { Database } from "sql.js";
import {
  createTable,
  deleteColumns,
  deleteRows,
  getTotalCount,
  insertColumn,
  insertRows,
  queryRowsByPage,
  updateCell,
} from "./sql-utils";

type Columns = { name: string; type: string }[];

class DataTable {
  private db: Database;
  private tableName = "main_data";

  constructor(db: Database) {
    this.db = db;
  }

  createTable(columns: Columns) {
    createTable(this.db, this.tableName, columns);
  }

  getRowsByPage(page: number, pageSize: number, orderBy?: string) {
    return queryRowsByPage(this.db, this.tableName, page, pageSize, orderBy);
  }

  insertRows(columns: string[], values: (string | number | null)[][]) {
    insertRows(this.db, this.tableName, columns, values);
  }

  deleteRows(ids: string[]) {
    deleteRows(this.db, this.tableName, "id", ids);
  }

  updateCell(id: string, columnName: string, value: string | number | null) {
    updateCell(this.db, this.tableName, "id", id, columnName, value);
  }

  insertColumn(columnName: string) {
    insertColumn(this.db, this.tableName, columnName);
  }

  deleteColumns(columns: string[]) {
    deleteColumns(this.db, this.tableName, columns);
  }

  getTotalCount() {
    return getTotalCount(this.db, this.tableName);
  }
}

export default DataTable;
