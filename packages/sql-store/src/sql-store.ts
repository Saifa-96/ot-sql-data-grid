import initSQL, { Database } from "sql.js";
import ColumnTable from "./column-table";
import DataTable from "./data-table";

interface Column {
  id: string;
  fieldName: string;
  width: number;
  displayName: string;
  orderBy: number;
  type: string;
}

class SQLStore {
  private db: Database;
  private columnTable: ColumnTable;
  private dataTable: DataTable;

  constructor(db: Database) {
    this.db = db;
    this.columnTable = new ColumnTable(db);
    this.dataTable = new DataTable(db);
  }

  init(columns: Column[]) {
    this.columnTable.createTable();
    this.columnTable.addColumnSettings(
      columns.map((c) => ({
        id: c.id,
        fieldName: c.fieldName,
        width: c.width,
        displayName: c.displayName,
        orderBy: c.orderBy,
      }))
    );

    this.dataTable.createTable(columns);
  }

  addRows(columns: string[], values: (string | number | null)[][]) {
    this.dataTable.insertRows(columns, values);
  }

  deleteRows(ids: string[]) {
    this.dataTable.deleteRows(ids);
  }

  getRowsByPage(page: number, rowsPerPage: number, orderBy?: string) {
    return this.dataTable.getRowsByPage(page, rowsPerPage, orderBy);
  }

  getHeader() {
    return this.columnTable
      .getColumnSettings()
      .sort((a, b) => a.orderBy - b.orderBy);
  }

  updateCell(id: string, columnName: string, value: string | number | null) {
    this.dataTable.updateCell(id, columnName, value);
  }

  addColumn(column: Column) {
    this.columnTable.addColumnSettings([
      {
        id: column.id,
        fieldName: column.fieldName,
        width: column.width,
        displayName: column.displayName,
        orderBy: column.orderBy,
      },
    ]);
    this.dataTable.insertColumn(column.fieldName);
  }

  delColumn(columnName: string) {
    this.columnTable.deleteColumnItem(columnName);
    this.dataTable.deleteColumns([columnName]);
  }

  getTotalCount() {
    return this.dataTable.getTotalCount();
  }

  static async new(filebuffer: Uint8Array) {
    const SQL = await initSQL({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });
    const db = new SQL.Database(filebuffer);
    const sqlStore = new SQLStore(db);
    return sqlStore;
  }

  exec(query: string) {
    return this.db.exec(query);
  }

  export() {
    return this.db.export();
  }

  getDBInfo() {
    const columnTableHeader = this.columnTable.getColumns();
    const dataTableHeader = this.dataTable.getColumns();
    const columnTableRows = this.columnTable.getColumnSettings();
    return {
      columnTableName: this.columnTable.tableName,
      columnTableHeader,
      columnTableRows,
      dataTableHeader,
      dataTableName: this.dataTable.tableName,
    };
  }
}

export default SQLStore;
