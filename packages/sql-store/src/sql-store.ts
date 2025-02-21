import initSQL, { Database } from "sql.js";
import ColumnTable from "./column-table";
import DataTable from "./data-table";
import { v4 as uuidv4 } from "uuid";

class SQLStore {
  private db: Database;
  private columnTable: ColumnTable;
  private dataTable: DataTable;

  constructor(db: Database) {
    this.db = db;
    this.columnTable = new ColumnTable(db);
    this.dataTable = new DataTable(db);
  }

  init(columns: { name: string; displayName: string; type: string }[]) {
    this.columnTable.createTable();
    this.columnTable.addColumnSettings(
      columns.map((c, i) => ({
        id: uuidv4(),
        name: c.name,
        displayName: c.displayName,
        orderBy: i,
      }))
    );

    this.dataTable.createTable(columns);
  }

  addRows(columns: string[], values: Record<string, string | number | null>[]) {
    const valueArr = values.map((v) => columns.map((c) => v[c]));
    this.dataTable.insertRows(valueArr);
  }

  deleteRows(ids: string[]) {
    this.dataTable.deleteRows(ids);
  }

  getRowsByPage(page: number, rowsPerPage: number) {
    return this.dataTable.getRowsByPage(page, rowsPerPage);
  }

  getHeader() {
    return this.columnTable.getColumnSettings();
  }

  updateCell(id: string, columnName: string, value: string | number | null) {
    this.dataTable.updateCell(id, columnName, value);
  }

  addColumn(column: { name: string; displayName: string; type: string }) {
    this.columnTable.addColumnSettings([
      {
        id: uuidv4(),
        name: column.name,
        displayName: column.displayName,
        orderBy: 2,
      },
    ]);
    this.dataTable.insertColumn(column.name);
  }

  delColumn(id: string) {
    this.columnTable.deleteColumnItem(id);
    this.dataTable.deleteColumns([id]);
  }

  static async new(filebuffer: Uint8Array) {
    const SQL = await initSQL();
    const db = new SQL.Database(filebuffer);
    const sqlStore = new SQLStore(db);
    return sqlStore;
  }

  exec(query: string) {
    return this.db.exec(query);
  }
}

export default SQLStore;
