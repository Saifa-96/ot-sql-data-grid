import { beforeAll, afterAll, describe, expect, test } from "@jest/globals";
import path from "node:path";
import fs from "node:fs";
import * as store from "./store";
import * as sql from "./sql";
import { Database } from "sql.js";
import { genUserItem } from "../faker-data";

describe("store module", () => {
  let db: Database;
  const filePath = path.join(__dirname, "../../__test__", "user.sqlite");

  beforeAll(async () => {
    fs.openSync(filePath, "w");
    db = await store.initStoreDB(filePath);
  });

  afterAll(() => {
    fs.unlinkSync(filePath);
  });

  test("initStore function", () => {
    const header = sql.getHeader(db, "user");
    expect(header).toEqual(mockHeader);
  });

  test("get users", () => {
    expect(store.getUsersByPage(db, 1, 100).length).toBe(100);
    expect(store.getUsersByPage(db, 2, 50).length).toBe(50);
    expect(store.getUsersByPage(db, 3, 50).length).toBe(0);
  });

  test("insert an new column", () => {
    store.insertColumn(db, "age", "年龄");
    const header = sql.getHeader(db, "user");
    expect(header).toEqual([
      ...mockHeader,
      {
        cid: 8,
        name: "age",
        type: "TEXT",
        nullable: true,
        defaultValue: null,
        primaryKey: false,
      },
    ]);

    const hasAgeField = Object.hasOwn(
      store.getUsersByPage(db, 1, 1)[0] as object,
      "age"
    );
    expect(hasAgeField).toBeTruthy();
  });

  test("inset new rows", () => {
    const user = genUserItem();
    store.addUsers(db, [user]);
    expect(store.getUsersByPage(db, 2, 100)).toEqual([{ ...user, age: null }]);
  });

  test("update a cell value", () => {
    const user = store.getUsersByPage(db, 1, 1)[0];
    const newAge = "20";

    store.updateUserAttr(db, "age", (user as { id: string }).id, newAge);

    const updatedUser = store.getUsersByPage(db, 1, 1)[0];
    // @ts-ignore
    expect(updatedUser.age).toBe(newAge);
  });
});

const mockHeader = [
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
    name: "wid",
    type: "TEXT",
    nullable: true,
    defaultValue: null,
    primaryKey: false,
  },
  {
    cid: 2,
    name: "name",
    type: "TEXT",
    nullable: true,
    defaultValue: null,
    primaryKey: false,
  },
  {
    cid: 3,
    name: "gender",
    type: "TEXT",
    nullable: true,
    defaultValue: null,
    primaryKey: false,
  },
  {
    cid: 4,
    name: "phone",
    type: "TEXT",
    nullable: true,
    defaultValue: null,
    primaryKey: false,
  },
  {
    cid: 5,
    name: "email",
    type: "TEXT",
    nullable: true,
    defaultValue: null,
    primaryKey: false,
  },
  {
    cid: 6,
    name: "birthday",
    type: "TEXT",
    nullable: true,
    defaultValue: null,
    primaryKey: false,
  },
  {
    cid: 7,
    name: "create_time",
    type: "TEXT",
    nullable: true,
    defaultValue: null,
    primaryKey: false,
  },
];
