import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import ColumnTable from "./column-table";
import initSQL from "sql.js";

describe("test sql utils", () => {
  let columnTable: ColumnTable;
  const filePath = path.join(__dirname, "../__test__", "column-table.sqlite");

  beforeAll(async () => {
    fs.openSync(filePath, "w");
    const filebuffer = fs.readFileSync(filePath);
    const SQL = await initSQL();
    const db = new SQL.Database(filebuffer);
    columnTable = new ColumnTable(db);
  });

  afterAll(() => {
    fs.unlinkSync(filePath);
  });

  test("column table", async () => {
    columnTable.createTable();
    const columnSettings = columnTable.getColumnSettings();
    expect(columnSettings).toEqual([]);

    columnTable.addColumnSettings([
      { id: "1", name: "name", width: 200, displayName: "Name", orderBy: 1 },
    ]);
    expect(columnTable.getColumnSettings()).toEqual([
      { id: "1", name: "name", width: 200, displayName: "Name", orderBy: 1 },
    ]);

    columnTable.updateOrderBy("1", 2);
    expect(columnTable.getColumnSettings()).toEqual([
      { id: "1", name: "name", width: 200, displayName: "Name", orderBy: 2 },
    ]);

    columnTable.updateDisplayName("1", "Name2");
    expect(columnTable.getColumnSettings()).toEqual([
      { id: "1", name: "name", width: 200, displayName: "Name2", orderBy: 2 },
    ]);

    const columnNames = columnTable.getColumnNames();
    expect(columnNames).toEqual(["name"]);

    columnTable.deleteColumnItem("Name");
    expect(columnTable.getColumnSettings()).toEqual([]);
  });
});
