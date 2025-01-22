import { afterAll, beforeAll, describe, expect, it, test } from "@jest/globals";
import * as sql from "./sql";
import path from "node:path";
import fs from "node:fs";
import { Database } from "sql.js";

describe("sql module", () => {
  let db: Database;
  const filePath = path.join(__dirname, "../../__test__", "user.sqlite");

  beforeAll(async () => {
    fs.openSync(filePath, "w");
    db = await sql.connectDB(filePath);
  });

  afterAll(() => {
    fs.unlinkSync(filePath);
  });

  test("connectDB function", async () => {
    expect(db).toBeDefined();
  });

  test("should return true if table exists", async () => {
    expect(sql.isTableExists(db, "user")).toBeFalsy();
    sql.createTable(db, "user", ["id", "name", "age"], "id");
    expect(sql.isTableExists(db, "user")).toBeTruthy();
  });

  test("insertRows function", async () => {
    sql.insertRows(
      db,
      "user",
      ["id", "name", "age"],
      [
        ["1", "Bob", "10"],
        ["2", "Andy", "20"],
      ]
    );
    const stmt = db.prepare("SELECT * FROM user");
    stmt.step();
    const rows = stmt.getAsObject();
    expect(rows).toEqual({ id: "1", name: "Bob", age: "10" });
  });

  test("queryRows function", async () => {
    const rows = sql.queryRows(db, "SELECT * FROM user");
    expect(rows).toEqual([
      { id: "1", name: "Bob", age: "10" },
      { id: "2", name: "Andy", age: "20" },
    ]);
  });

  test("getHeader function", async () => {
    const header = sql.getHeader(db, "user");
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
        name: "age",
        nullable: true,
        primaryKey: false,
        type: "TEXT",
      },
    ]);
  });

  test("delete", () => {
    sql.deleteRows(db, "user", "id", ["1"]);
    const rows = sql.queryRows(db, "SELECT * FROM user");
    expect(rows).toEqual([{ id: "2", name: "Andy", age: "20" }]);
  });

  test("drop columns", () => {
    sql.deleteCols(db, "user", ["name", "age"]);
    const header = sql.getHeader(db, "user");
    expect(header).toEqual([
      {
        cid: 0,
        name: "id",
        type: "TEXT",
        nullable: true,
        defaultValue: null,
        primaryKey: true,
      },
    ]);
  });

  test("add column", () => {
    sql.insertColumn(db, "user", "email");
    const header = sql.getHeader(db, "user");
    expect(header).toEqual([
      {
        cid: 0,
        name: "id",
        type: "TEXT",
        nullable: true,
        defaultValue: null,
        primaryKey: true,
      },
      {
        cid: 1,
        name: "email",
        type: "TEXT",
        nullable: true,
        defaultValue: null,
        primaryKey: false,
      },
    ]);
  });

  test("update a cell", () => {
    const user = sql.queryRows(db, "SELECT * FROM user")[0];
    const id = (user as { id: string }).id;
    sql.updateCell(db, "user", "id", id, "email", `"123@qq.com"`);
    expect(sql.queryRows(db, "SELECT * FROM user")[0]).toEqual({
      id: "2",
      email: "123@qq.com",
    });
  });
});
