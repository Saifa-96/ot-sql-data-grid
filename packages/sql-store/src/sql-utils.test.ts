import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import * as utils from "./sql-utils";
import initSQL, { Database } from "sql.js";
import { z } from "zod";

const tableName = "test_table";
const columns = ["name", "gender"];

describe("test sql utils", () => {
  let db: Database;
  const filePath = path.join(__dirname, "../__test__", "sql-utils.sqlite");

  beforeAll(async () => {
    fs.openSync(filePath, "w");
    const filebuffer = fs.readFileSync(filePath);
    const SQL = await initSQL();
    db = new SQL.Database(filebuffer);
    utils.createTable(
      db,
      tableName,
      columns.map((i) => ({ name: i, type: "TEXT" }))
    );
  });

  afterAll(() => {
    fs.unlinkSync(filePath);
  });

  test("createTable function", async () => {
    const stmt = db.prepare(
      "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='test_table';"
    );
    stmt.step();
    const data = stmt.getAsObject();
    stmt.free();
    expect(data).toEqual({ "count(*)": 1 });
  });

  test("getHeader function", async () => {
    const header = utils.getHeader(db, tableName);
    expect(header).toEqual([
      {
        cid: 0,
        name: "id",
        defaultValue: null,
        nullable: true,
        primaryKey: true,
        type: "TEXT",
      },
      {
        cid: 1,
        name: "name",
        defaultValue: null,
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
      {
        cid: 2,
        name: "gender",
        defaultValue: null,
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
      {
        cid: 3,
        name: "create_time",
        defaultValue: "CURRENT_TIMESTAMP",
        nullable: false,
        primaryKey: false,
        type: "DATETIME",
      },
    ]);
  });

  test("insertRows function and queryRowsByPage function and getTotalCount function", async () => {
    utils.insertRows(
      db,
      tableName,
      ["id", ...columns],
      [
        ["1", "Bob", "male"],
        ["2", "Alice", "female"],
      ]
    );
    const result = utils.queryRowsByPage(db, tableName, 1, 1);

    const { success } = schema.safeParse(result[0]);
    expect(success).toBeTruthy();

    const count = utils.getTotalCount(db, tableName);
    expect(count).toBe(2);
  });

  test("deleteRows function", () => {
    utils.insertRows(
      db,
      tableName,
      ["id", ...columns],
      [["3", "Lily", "female"]]
    );
    const result = utils.queryRowsByPage(db, tableName, 3, 1);
    const { success, data } = schema.safeParse(result[0]);
    expect(success).toBeTruthy();
    expect(data?.name).toBe("Lily");

    utils.deleteRows(db, tableName, "id", ["3"]);

    const result2 = utils.queryRowsByPage(db, tableName, 3, 1);
    expect(result2).toEqual([]);
  });

  test("updateRows function", () => {
    utils.insertRows(db, tableName, ["id", ...columns], [["4", "Tom", "male"]]);
    const users = utils
      .queryRowsByPage(db, tableName, 1, 100)
      .map((row) => schema.parse(row));
    expect(users.find((u) => u.id === "4")).toBeTruthy();
    utils.updateCell(db, tableName, "id", "4", "name", "Jerry");
    const users2 = utils
      .queryRowsByPage(db, tableName, 1, 100)
      .map((row) => schema.parse(row));
    expect(users2.find((u) => u.id === "4")?.name).toBe("Jerry");
  });

  test("insertColumn function and deleteColumn function", () => {
    utils.insertColumn(db, tableName, "age");
    const header = utils.getHeader(db, tableName);
    const newColumns = ["id", ...columns, "create_time", "age"];
    expect(header.map((col) => col.name)).toEqual(newColumns);
    const rows = utils.queryRowsByPage(db, tableName, 1, 1);
    expect(Object.keys(rows[0])).toEqual(newColumns);

    utils.deleteColumns(db, tableName, ["age"]);
    const header2 = utils.getHeader(db, tableName);
    const rows2 = utils.queryRowsByPage(db, tableName, 1, 1);
    newColumns.pop();
    expect(Object.keys(rows2[0])).toEqual(newColumns);
    expect(header2.map((col) => col.name)).toEqual([
      "id",
      ...columns,
      "create_time",
    ]);
  });

  test("query all rows", () => {
    const rows = utils.queryAllRows(db, tableName);
    utils.insertRows(db, tableName, ["id", ...columns], [["5", "Lana"]]);
    const rows2 = utils.queryAllRows(db, tableName);
    expect(rows2.length).toBe(rows.length + 1);
  });

  test("orderBy statement", async () => {
    utils.insertRows(
      db,
      tableName,
      ["id", "name", "gender", "create_time"],
      [["1-1", "Tom", "male", "3000-02-24 06:08:28"]]
    );
    const result = utils.queryRowsByPage(
      db,
      tableName,
      1,
      10,
      "create_time DESC"
    );
    expect(result.length).toBe(5);
    expect(result[0]).toEqual({
      create_time: "3000-02-24 06:08:28",
      gender: "male",
      id: "1-1",
      name: "Tom",
    });
  });
});

const schema = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.string(),
  create_time: z.string(),
});
