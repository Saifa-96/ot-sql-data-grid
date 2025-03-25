import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import SQLStore from "./sql-store";
import initSqlJs from "sql.js";

describe("test sql store", () => {
  const filePath = path.join(__dirname, "../__test__", "sql-store.sqlite");
  let sqlStore: SQLStore;

  beforeAll(async () => {
    fs.openSync(filePath, "w");
    const filebuffer = fs.readFileSync(filePath);
    const sql = await initSqlJs();
    const db = new sql.Database(filebuffer);
    sqlStore = new SQLStore(db);
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
        fieldName: "name",
        width: 200,
        displayName: "姓名",
        orderBy: 0,
      },
      {
        id: expect.any(String),
        fieldName: "gender",
        width: 200,
        displayName: "性别",
        orderBy: 1,
      },
      {
        id: expect.any(String),
        fieldName: "email",
        width: 200,
        displayName: "邮箱",
        orderBy: 2,
      },
      {
        id: expect.any(String),
        fieldName: "phone",
        width: 200,
        displayName: "手机号",
        orderBy: 3,
      },
      {
        id: expect.any(String),
        fieldName: "birthday",
        width: 200,
        displayName: "出生日期",
        orderBy: 4,
      },
    ];

    sqlStore.init([
      {
        id: "name",
        orderBy: 0,
        fieldName: "name",
        width: 200,
        displayName: "姓名",
        type: "TEXT",
      },
      {
        id: "gender",
        orderBy: 1,
        fieldName: "gender",
        width: 200,
        displayName: "性别",
        type: "TEXT",
      },
      {
        id: "email",
        orderBy: 2,
        fieldName: "email",
        width: 200,
        displayName: "邮箱",
        type: "TEXT",
      },
      {
        id: "phone",
        orderBy: 3,
        fieldName: "phone",
        width: 200,
        displayName: "手机号",
        type: "TEXT",
      },
      {
        id: "birthday",
        orderBy: 4,
        fieldName: "birthday",
        width: 200,
        displayName: "出生日期",
        type: "TEXT",
      },
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
    const headerStr = ["id", ...header.map((h) => h.name)];

    const rowValues = rows.map((row) => {
      const map = new Map(Object.entries(row));
      return headerStr.map((h) => map.get(h) ?? null);
    });
    sqlStore.addRows(headerStr, rowValues);

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
      id: "address",
      fieldName: "address",
      width: 200,
      displayName: "地址",
      type: "TEXT",
      orderBy: 2,
    });
    expect(sqlStore.getHeader()).toEqual(
      [
        ...headerFromSQLStore,
        {
          displayName: "地址",
          width: 200,
          id: expect.any(String),
          fieldName: "address",
          orderBy: 2,
        },
      ].sort((a, b) => a.orderBy - b.orderBy)
    );
    expect(sqlStore.getRowsByPage(1, 1)).toEqual([
      {
        ...rows[2],
        name: "李四",
        address: null,
        create_time: expect.any(String),
      },
    ]);

    sqlStore.delColumn("address");

    expect(sqlStore.getTotalCount()).toBe(3);

    const data = sqlStore.getDBInfo();
    expect(data).toEqual({
      columnTableHeader: [
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
          name: "field_name",
          nullable: true,
          primaryKey: false,
          type: "TEXT",
        },
        {
          cid: 2,
          defaultValue: null,
          name: "display_name",
          nullable: true,
          primaryKey: false,
          type: "TEXT",
        },
        {
          cid: 3,
          defaultValue: null,
          name: "width",
          nullable: true,
          primaryKey: false,
          type: "INTEGER",
        },
        {
          cid: 4,
          defaultValue: null,
          name: "order_by",
          nullable: true,
          primaryKey: false,
          type: "INTEGER",
        },
        {
          cid: 5,
          defaultValue: "CURRENT_TIMESTAMP",
          name: "create_time",
          nullable: false,
          primaryKey: false,
          type: "DATETIME",
        },
      ],
      columnTableRows: [
        {
          displayName: "姓名",
          fieldName: "name",
          id: "name",
          orderBy: 0,
          width: 200,
        },
        {
          displayName: "性别",
          fieldName: "gender",
          id: "gender",
          orderBy: 1,
          width: 200,
        },
        {
          displayName: "邮箱",
          fieldName: "email",
          id: "email",
          orderBy: 2,
          width: 200,
        },
        {
          displayName: "手机号",
          fieldName: "phone",
          id: "phone",
          orderBy: 3,
          width: 200,
        },
        {
          displayName: "出生日期",
          fieldName: "birthday",
          id: "birthday",
          orderBy: 4,
          width: 200,
        },
      ],
      dataTableHeader: [
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
          name: "email",
          nullable: true,
          primaryKey: false,
          type: "TEXT",
        },
        {
          cid: 4,
          defaultValue: null,
          name: "phone",
          nullable: true,
          primaryKey: false,
          type: "TEXT",
        },
        {
          cid: 5,
          defaultValue: null,
          name: "birthday",
          nullable: true,
          primaryKey: false,
          type: "TEXT",
        },
        {
          cid: 6,
          defaultValue: "CURRENT_TIMESTAMP",
          name: "create_time",
          nullable: false,
          primaryKey: false,
          type: "DATETIME",
        },
      ],
    });
  });
});
