import { Database } from "sql.js";
import {
  createTable,
  deleteColumns,
  deleteRows,
  insertColumn,
  insertRows,
  queryRowsByPage,
  updateCell,
} from "./sql-utils";

type Columns = { name: string; type: string }[];

class DataTable {
  private db: Database;
  private tableName = "main_data";
  private columns: Columns = [];

  constructor(db: Database) {
    this.db = db;
  }

  createTable(columns: Columns) {
    this.columns = columns;
    createTable(this.db, this.tableName, columns);
  }

  getRowsByPage(page: number, pageSize: number) {
    return queryRowsByPage(this.db, this.tableName, page, pageSize);
  }

  insertRows(values: (string | number | null)[][]) {
    const cols = this.columns.map((i) => i.name);
    cols.unshift("id");
    insertRows(this.db, this.tableName, cols, values);
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
}

export default DataTable;
