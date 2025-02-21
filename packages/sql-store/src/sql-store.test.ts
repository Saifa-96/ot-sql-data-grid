import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import SQLStore from "./sql-store";

describe("test sql store", () => {
  const filePath = path.join(__dirname, "../__test__", "sql-store.sqlite");
  let sqlStore: SQLStore;

  beforeAll(async () => {
    fs.openSync(filePath, "w");
    const filebuffer = fs.readFileSync(filePath);
    sqlStore = await SQLStore.new(filebuffer);
  });

  afterAll(() => {
    fs.unlinkSync(filePath);
  });

  test("test", () => {
    expect(sqlStore).toBeDefined();

    const header = [
      { name: "name", displayName: "姓名", type: "TEXT" },
      { name: "gender", displayName: "性别", type: "TEXT" },
      { name: "email", displayName: "邮箱", type: "TEXT" },
      { name: "phone", displayName: "手机号", type: "TEXT" },
      { name: "birthday", displayName: "出生日期", type: "TEXT" },
    ];

    const headerFromSQLStore = [
      {
        id: expect.any(String),
        name: "name",
        displayName: "姓名",
        orderBy: 0,
      },
      {
        id: expect.any(String),
        name: "gender",
        displayName: "性别",
        orderBy: 1,
      },
      {
        id: expect.any(String),
        name: "email",
        displayName: "邮箱",
        orderBy: 2,
      },
      {
        id: expect.any(String),
        name: "phone",
        displayName: "手机号",
        orderBy: 3,
      },
      {
        id: expect.any(String),
        name: "birthday",
        displayName: "出生日期",
        orderBy: 4,
      },
    ];

    sqlStore.init([
      { name: "name", displayName: "姓名", type: "TEXT" },
      { name: "gender", displayName: "性别", type: "TEXT" },
      { name: "email", displayName: "邮箱", type: "TEXT" },
      { name: "phone", displayName: "手机号", type: "TEXT" },
      { name: "birthday", displayName: "出生日期", type: "TEXT" },
    ]);

    expect(sqlStore.getHeader()).toEqual(headerFromSQLStore);

    const rows = [
      {
        id: "1",
        name: "张三",
        gender: "男",
        email: "11@qq.com",
        phone: "123456789",
        birthday: "1990-01-01",
      },
      {
        id: "2",
        name: "张三",
        gender: "男",
        email: "11@qq.com",
        phone: "123456789",
        birthday: "1990-01-01",
      },
      {
        id: "3",
        name: "张三",
        gender: "男",
        email: "11@qq.com",
        phone: "123456789",
        birthday: "1990-01-01",
      },
      {
        id: "4",
        name: "张三",
        gender: "男",
        email: "11@qq.com",
        phone: "123456789",
        birthday: "1990-01-01",
      },
      {
        id: "5",
        name: "张三",
        gender: "男",
        email: "11@qq.com",
        phone: "123456789",
        birthday: "1990-01-01",
      },
    ];
    sqlStore.addRows(["id", ...header.map((h) => h.name)], rows);

    expect(sqlStore.getRowsByPage(1, 1)).toEqual([
      {
        ...rows[0],
        create_time: expect.any(String),
      },
    ]);

    sqlStore.deleteRows(["1", "2"]);
    expect(sqlStore.getRowsByPage(1, 1)).toEqual([
      {
        ...rows[2],
        create_time: expect.any(String),
      },
    ]);

    sqlStore.updateCell("3", "name", "李四");
    expect(sqlStore.getRowsByPage(1, 1)).toEqual([
      {
        ...rows[2],
        name: "李四",
        create_time: expect.any(String),
      },
    ]);

    sqlStore.addColumn({
      name: "address",
      displayName: "地址",
      type: "TEXT",
    });
    expect(sqlStore.getHeader()).toEqual([
      ...headerFromSQLStore,
      {
        displayName: "地址",
        id: expect.any(String),
        name: "address",
        orderBy: 2,
      },
    ]);
    expect(sqlStore.getRowsByPage(1, 1)).toEqual([
        {
            ...rows[2],
            name: "李四",
            address: null,
            create_time: expect.any(String),
        }
    ]);

    sqlStore.delColumn("address");
  });
});
