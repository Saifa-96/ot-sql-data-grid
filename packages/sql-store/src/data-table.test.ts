import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import DataTable from "./data-table";
import initSQL, { Database } from "sql.js";
import { getHeader } from "./sql-utils";

describe("test sql utils", () => {
  let dataTable: DataTable;
  let db: Database;
  const filePath = path.join(__dirname, "../__test__", "data-table.sqlite");

  beforeAll(async () => {
    fs.openSync(filePath, "w");
    const filebuffer = fs.readFileSync(filePath);
    const SQL = await initSQL();
    db = new SQL.Database(filebuffer);
    dataTable = new DataTable(db);
  });

  afterAll(() => {
    fs.unlinkSync(filePath);
  });

  test("data table", async () => {
    const columns = [
      { name: "name", type: "TEXT" },
      { name: "gender", type: "TEXT" },
      { name: "age", type: "INTEGER" },
    ];
    dataTable.createTable(columns);
    const header = getHeader(db, "main_data");
    expect(header).toEqual([
      {
        cid: 0,
        defaultValue: null,
        name: "id",
        nullable: true,
        primaryKey: true,
        type: "TEXT",
      },
      {
        cid: 1,
        defaultValue: null,
        name: "name",
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
      {
        cid: 2,
        defaultValue: null,
        name: "gender",
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
      {
        cid: 3,
        defaultValue: null,
        name: "age",
        nullable: true,
        primaryKey: false,
        type: "INTEGER",
      },
      {
        cid: 4,
        defaultValue: "CURRENT_TIMESTAMP",
        name: "create_time",
        nullable: false,
        primaryKey: false,
        type: "DATETIME",
      },
    ]);

    const rows = dataTable.getRowsByPage(1, 10);
    expect(rows).toEqual([]);

    const newRows = [
      ["1", "John Doe", "Male", 25],
      ["2", "Jane Smith", "Female", 30],
      ["3", "Bob Johnson", "Male", 40],
    ];
    dataTable.insertRows(
      header.map((h) => h.name).filter(item => item !== 'create_time'),
      newRows
    );

    const updatedValue = "Updated";
    dataTable.updateCell("1", "name", updatedValue);

    const updatedRows = dataTable.getRowsByPage(1, 10);
    expect(updatedRows).toEqual([
      {
        id: "1",
        name: updatedValue,
        gender: "Male",
        age: 25,
        create_time: expect.any(String),
      },
      {
        id: "2",
        name: "Jane Smith",
        gender: "Female",
        age: 30,
        create_time: expect.any(String),
      },
      {
        id: "3",
        name: "Bob Johnson",
        gender: "Male",
        age: 40,
        create_time: expect.any(String),
      },
    ]);

    dataTable.deleteRows(["2"]);
    expect(dataTable.getRowsByPage(1, 10)).toEqual([
      {
        id: "1",
        name: updatedValue,
        gender: "Male",
        age: 25,
        create_time: expect.any(String),
      },
      {
        id: "3",
        name: "Bob Johnson",
        gender: "Male",
        age: 40,
        create_time: expect.any(String),
      },
    ]);

    const newColumn = "email";
    dataTable.insertColumn(newColumn);
    expect(getHeader(db, "main_data")).toEqual([
      {
        cid: 0,
        defaultValue: null,
        name: "id",
        nullable: true,
        primaryKey: true,
        type: "TEXT",
      },
      {
        cid: 1,
        defaultValue: null,
        name: "name",
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
      {
        cid: 2,
        defaultValue: null,
        name: "gender",
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
      {
        cid: 3,
        defaultValue: null,
        name: "age",
        nullable: true,
        primaryKey: false,
        type: "INTEGER",
      },
      {
        cid: 4,
        defaultValue: "CURRENT_TIMESTAMP",
        name: "create_time",
        nullable: false,
        primaryKey: false,
        type: "DATETIME",
      },
      {
        cid: 5,
        defaultValue: null,
        name: "email",
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
    ]);
    expect(dataTable.getRowsByPage(1, 1)).toEqual([
      {
        id: "1",
        name: updatedValue,
        gender: "Male",
        email: null,
        age: 25,
        create_time: expect.any(String),
      },
    ]);

    dataTable.deleteColumns(["email"]);
    expect(getHeader(db, "main_data")).toEqual([
      {
        cid: 0,
        defaultValue: null,
        name: "id",
        nullable: true,
        primaryKey: true,
        type: "TEXT",
      },
      {
        cid: 1,
        defaultValue: null,
        name: "name",
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
      {
        cid: 2,
        defaultValue: null,
        name: "gender",
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
      {
        cid: 3,
        defaultValue: null,
        name: "age",
        nullable: true,
        primaryKey: false,
        type: "INTEGER",
      },
      {
        cid: 4,
        defaultValue: "CURRENT_TIMESTAMP",
        name: "create_time",
        nullable: false,
        primaryKey: false,
        type: "DATETIME",
      },
    ]);

    const count = dataTable.getTotalCount();
    expect(count).toBe(2);

    dataTable.insertRows(
      header.map((h) => h.name).filter(name => name !== 'create_time'),
      [["4", "Alice", "Female", 99]]
    );
    const rowsData = dataTable.getRowsByPage(1, 10, "age DESC");
    expect(rowsData[0]).toEqual({
      age: 99,
      create_time: expect.any(String),
      gender: "Female",
      id: "4",
      name: "Alice",
    });
  });
});
