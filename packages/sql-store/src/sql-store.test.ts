import { faker } from "@faker-js/faker";
import { ColumnChanges, Operation } from "operational-transformation";
import initSqlJs from "sql.js";
import { v4 as uuid } from "uuid";
import { describe, expect, test } from "vitest";
import { TableSettings, COLUMN_TABLE_NAME, DATA_TABLE_NAME } from "./constants";
import { SQLStore } from "./sql-store";

const defaultColumnItems: ColumnChanges[] = [
  {
    fieldName: "name",
    displayName: "Name",
    width: 200,
    orderBy: 20000,
  },
  {
    fieldName: "age",
    displayName: "Age",
    width: 150,
    orderBy: 10000,
  },
  {
    fieldName: "address",
    displayName: "Address",
    width: 300,
    orderBy: 30000,
  },
];
const generateRow = () => [
  faker.person.fullName(),
  faker.number.int({ min: 18, max: 99 }),
  faker.location.streetAddress(),
];
const genMockData = (count: number) => ({
  rows: Array(count).fill(null).map(generateRow),
  ids: Array(count)
    .fill(null)
    .map(() => uuid()),
});
const initSQLStore = async (count: number) => {
  const { rows, ids } = genMockData(count);
  const engine = await initSqlJs();
  const db = new engine.Database();
  const sqlStore = new SQLStore(db);
  sqlStore.init(defaultColumnItems, ids, rows);
  return { store: sqlStore, ids, rows };
};

const defaultTableSettings: {
  columnTableName: string;
  dataTableName: string;
  columnTable: TableSettings;
  dataTable: TableSettings;
} = {
  columnTableName: COLUMN_TABLE_NAME,
  dataTableName: DATA_TABLE_NAME,
  columnTable: [
    {
      cid: 0,
      name: "field_name",
      type: "STRING",
      nullable: false,
      defaultValue: null,
      primaryKey: true,
    },
    {
      cid: 1,
      name: "display_name",
      type: "STRING",
      nullable: false,
      defaultValue: null,
      primaryKey: false,
    },
    {
      cid: 2,
      name: "width",
      type: "INTEGER",
      nullable: false,
      defaultValue: null,
      primaryKey: false,
    },
    {
      cid: 3,
      name: "order_by",
      type: "INTEGER",
      nullable: false,
      defaultValue: null,
      primaryKey: false,
    },
  ],
  dataTable: [
    {
      cid: 0,
      name: "id",
      type: "STRING",
      nullable: false,
      defaultValue: null,
      primaryKey: true,
    },
    {
      cid: 1,
      name: "create_time",
      type: "DATETIME",
      nullable: false,
      defaultValue: "CURRENT_TIMESTAMP",
      primaryKey: false,
    },
    {
      cid: 2,
      name: "name",
      type: "STRING",
      nullable: true,
      defaultValue: null,
      primaryKey: false,
    },
    {
      cid: 3,
      name: "age",
      type: "STRING",
      nullable: true,
      defaultValue: null,
      primaryKey: false,
    },
    {
      cid: 4,
      name: "address",
      type: "STRING",
      nullable: true,
      defaultValue: null,
      primaryKey: false,
    },
  ],
};

describe("Test SQL Store regular using", () => {
  test("should init the sql store", async () => {
    const count = 10;
    const { store } = await initSQLStore(count);
    expect(store.getRecordTotalCount()).toBe(count);
    expect(store.getColumns()).toEqual(defaultColumnItems);
    expect(store.getTableMetadata(DATA_TABLE_NAME)).toEqual(
      defaultTableSettings.dataTable
    );
    expect(store.getTableMetadata(COLUMN_TABLE_NAME)).toEqual(
      defaultTableSettings.columnTable
    );
  });

  test("should insert columns", async () => {
    const { store } = await initSQLStore(10);
    const result = store.execOperation({
      insertColumns: {
        email: {
          fieldName: "email",
          displayName: "Email",
          width: 200,
          orderBy: 40000,
        },
        phone: {
          fieldName: "phone",
          displayName: "Phone",
          width: 200,
          orderBy: 50000,
        },
      },
    });
    expect(result.type).toBe("success");
    expect(store.getColumns()).toEqual([
      ...defaultColumnItems,
      {
        fieldName: "email",
        displayName: "Email",
        width: 200,
        orderBy: 40000,
      },
      {
        fieldName: "phone",
        displayName: "Phone",
        width: 200,
        orderBy: 50000,
      },
    ]);
    expect(store.getTableMetadata(DATA_TABLE_NAME)).toEqual([
      ...defaultTableSettings.dataTable,
      {
        cid: 5,
        name: "email",
        type: "STRING",
        nullable: true,
        defaultValue: null,
        primaryKey: false,
      },
      {
        cid: 6,
        name: "phone",
        type: "STRING",
        nullable: true,
        defaultValue: null,
        primaryKey: false,
      },
    ]);
  });

  test("should update columns", async () => {
    const { store } = await initSQLStore(10);
    const item: ColumnChanges = {
      fieldName: "name",
      displayName: "ChangedName",
      width: 201,
      orderBy: 20001,
    };
    const result = store.execOperation({
      updateColumns: {
        name: item,
      },
    });
    const [_, ...rest] = defaultColumnItems;
    expect(result.type).toBe("success");
    expect(store.getColumns()).toEqual([item, ...rest]);
  });

  test("should delete columns", async () => {
    const { store } = await initSQLStore(10);
    const result = store.execOperation({
      deleteColumns: ["name", "address"],
    });

    expect(result.type).toBe("success");
    expect(store.getColumns()).toEqual([defaultColumnItems[1]]);
    expect(store.getTableMetadata(DATA_TABLE_NAME)).toEqual(
      defaultTableSettings.dataTable
        .filter((col) => col.name !== "name" && col.name !== "address")
        .map((col, index) => ({
          ...col,
          cid: index,
        }))
    );
  });

  test("should insert records", async () => {
    const { store } = await initSQLStore(10);
    const { rows, ids } = genMockData(10);
    const result = store.execOperation({
      insertRecords: [
        {
          ids: ids.map((i) => ({ type: "uuid", uuid: i })),
          columns: defaultColumnItems.map((col) => col.fieldName),
          values: rows,
        },
      ],
    });
    expect(result.type).toBe("success");
    expect(store.getRecordTotalCount()).toBe(20);
  });

  test("should update records", async () => {
    const { store, ids } = await initSQLStore(10);
    const first10 = ids.slice(0, 10);
    const newValues = genMockData(10).rows;
    const result = store.execOperation({
      updateRecords: [
        {
          ids: first10.map((id) => ({ type: "uuid", uuid: id })),
          columns: defaultColumnItems.map((col) => col.fieldName),
          values: newValues,
        },
      ],
    });
    expect(result.type).toBe("success");
    const pageData = store.getRecordsByPage(1, 10);
    expect(
      pageData.map((record) =>
        defaultColumnItems.map((col) => record[col.fieldName])
      )
    ).toEqual(newValues);
  });

  test("should delete records", async () => {
    const { store, ids } = await initSQLStore(10);
    const first10 = ids.slice(0, 10);
    const result = store.execOperation({
      deleteRecords: first10.map((id) => ({ type: "uuid", uuid: id })),
    });
    expect(result.type).toBe("success");
    expect(store.getRecordTotalCount()).toBe(0);
  });

  test("should get records by page", async () => {
    const { store } = await initSQLStore(10);
    const pageData = store.getRecordsByPage(1, 5);
    expect(pageData.length).toBe(5);
    expect(store.getRecordTotalCount()).toBe(10);
    const secondPageData = store.getRecordsByPage(2, 5);
    expect(secondPageData.length).toBe(5);
    const items = store.getRecordsByPage(6, 1);
    expect(items[0]).toEqual(secondPageData[0]);
    expect(store.getRecordsByPage(3, 10)).toEqual([]);
  });

  test("Test performance", async () => {
    const { store } = await initSQLStore(30000);
    const ids = Array(30000)
      .fill(null)
      .map(() => ({
        symbol: uuid(),
      }));
    const values = Array(30000)
      .fill(null)
      .map(() => [faker.person.gender()]);
    const operation: Operation = {
      insertColumns: {
        gender: {
          fieldName: "gender",
          displayName: "Gender",
          width: 200,
          orderBy: 40000,
        },
      },
      insertRecords: [
        {
          ids,
          columns: ["gender"],
          values,
        },
      ],
    };
    const start = performance.now();
    store.execOperation(operation);
    const end = performance.now();
    console.log("Performance test took: ", end - start, "ms");
    expect(store.getRecordTotalCount()).toBe(60000);
  });
});

describe("Test SQL Store error handling", () => {
  test("should rollback changes when deleting an not existent column", async () => {
    const { store } = await initSQLStore(10);
    const { ids, rows } = genMockData(1);
    const result = store.execOperation({
      insertRecords: [
        {
          ids: ids.map((i) => ({ type: "uuid", uuid: i })),
          columns: defaultColumnItems.map((col) => col.fieldName),
          values: rows,
        },
      ],
      deleteColumns: ["non_existent_column"],
    });
    expect(result.type).toBe("failed");
    expect(store.getRecordTotalCount()).toBe(10);
  });

  test("should rollback changes when inserting an existent column", async () => {
    const { store } = await initSQLStore(10);
    const { ids, rows } = genMockData(1);
    const result = store.execOperation({
      insertRecords: [
        {
          ids: ids.map((i) => ({ type: "uuid", uuid: i })),
          columns: defaultColumnItems.map((col) => col.fieldName),
          values: rows,
        },
      ],
      insertColumns: {
        name: {
          fieldName: "name",
          displayName: "Name",
          width: 200,
          orderBy: 20000,
        },
      },
    });
    expect(result.type).toBe("failed");
    expect(store.getColumns()).toEqual(defaultColumnItems);
    expect(store.getRecordTotalCount()).toBe(10);
  });

  test("should rollback changes when inserting a record with an non-existent column", async () => {
    const { store } = await initSQLStore(10);
    const { ids, rows } = genMockData(1);
    const result = store.execOperation({
      insertRecords: [
        {
          ids: ids.map((i) => ({ type: "uuid", uuid: i })),
          columns: [
            ...defaultColumnItems.map((col) => col.fieldName),
            "non_existent_column",
          ],
          values: [...rows, ["non_existent_value"]],
        },
      ],
    });
    expect(result.type).toBe("failed");
  });

  test("should rollback all changes when operation contains mixed success and error items", async () => {
    const { store } = await initSQLStore(10);

    // 第一步：先记录原始状态
    const originalColumnCount = store.getColumns().length;
    const originalRecordCount = store.getRecordTotalCount();

    // 第二步：构造一个复合操作，前面部分正常，后面部分出错
    const result = store.execOperation({
      // 成功的部分 - 新增一列
      insertColumns: {
        gender: {
          fieldName: "gender",
          displayName: "Gender",
          width: 150,
          orderBy: 40000,
        },
      },
      // 成功的部分 - 新增一些记录
      insertRecords: [
        {
          ids: [{ uuid: uuid() }],
          columns: ["name", "age", "address"],
          values: [["New Person", 25, "New Address"]],
        },
      ],
      // 错误的部分 - 删除不存在的列
      deleteColumns: ["non_existent_column"],
    });

    // 第三步：验证结果
    expect(result.type).toBe("failed");
    // 验证所有已执行的操作都已回滚
    expect(store.getColumns().length).toBe(originalColumnCount);
    expect(store.getRecordTotalCount()).toBe(originalRecordCount);
    // 验证gender列没有被添加
    expect(store.getColumns().some((col) => col.fieldName === "gender")).toBe(
      false
    );
  });

  test("should rollback when updating non-existent records and inserting valid columns", async () => {
    const { store } = await initSQLStore(10);

    const originalColumns = store.getColumns();
    const nonExistentId = uuid(); // 不存在的记录ID

    const result = store.execOperation({
      // 有效操作 - 应该成功，但会被回滚
      insertColumns: {
        email: {
          fieldName: "email",
          displayName: "Email Address",
          width: 200,
          orderBy: 50000,
        },
      },
      // 无效操作 - 会导致失败
      updateRecords: [
        {
          ids: [{ uuid: nonExistentId }],
          columns: ["name1"],
          values: [["Updated Name"]],
        },
      ],
    });

    expect(result.type).toBe("failed");
    // 确认列未被添加（回滚成功）
    expect(store.getColumns()).toEqual(originalColumns);
    // 验证email列没有被添加
    expect(store.getColumns().some((col) => col.fieldName === "email")).toBe(
      false
    );
  });

  test("should rollback complex operations with multiple modifications", async () => {
    const { store, ids } = await initSQLStore(10);

    // 记录原始状态
    const originalColumns = store.getColumns();
    const originalRecordCount = store.getRecordTotalCount();

    // 创建一个复杂操作，混合多种修改
    const result = store.execOperation({
      // 1. 添加新列
      insertColumns: {
        email: {
          fieldName: "email",
          displayName: "Email",
          width: 200,
          orderBy: 40000,
        },
      },
      // 2. 修改现有列
      updateColumns: {
        name: {
          fieldName: "name",
          displayName: "Full Name", // 修改显示名
          width: 250, // 修改宽度
          orderBy: 20000,
        },
      },
      // 3. 添加新记录
      insertRecords: [
        {
          ids: [{ uuid: uuid() }],
          columns: ["name", "age", "address"],
          values: [["New Person", 30, "Some Address"]],
        },
      ],
      // 4. 更新现有记录
      updateRecords: [
        {
          ids: [{ uuid: ids[0] }],
          columns: ["name"],
          values: [["Updated Name"]],
        },
      ],
      // 5. 导致操作失败的部分 - 删除不存在的列
      deleteColumns: ["non_existent_column"],
    });

    // 验证操作失败
    expect(result.type).toBe("failed");

    // 验证所有更改都已回滚
    expect(store.getColumns()).toEqual(originalColumns);
    expect(store.getRecordTotalCount()).toBe(originalRecordCount);

    // 获取第一条记录，确认其名称未被更新
    const firstRecord = store.getRecordsByPage(1, 1)[0];
    expect(firstRecord.name).not.toBe("Updated Name");
  });

  test("should rollback when valid operation follows an invalid one", async () => {
    const { store } = await initSQLStore(10);

    // 先创建一个新列，以便后续能删除它
    const setupResult = store.execOperation({
      insertColumns: {
        email: {
          fieldName: "email",
          displayName: "Email",
          width: 200,
          orderBy: 40000,
        },
      },
    });
    expect(setupResult.type).toBe("success");

    // 记录当前状态
    const currentColumns = store.getColumns();
    const currentRecordCount = store.getRecordTotalCount();

    // 创建一个操作，先执行无效操作，再执行有效操作
    const result = store.execOperation({
      // 1. 无效操作 - 更新不存在的列
      updateColumns: {
        non_existent: {
          fieldName: "non_existent",
          displayName: "Not Exists",
          width: 100,
          orderBy: 60000,
        },
      },
      // 2. 有效操作 - 删除存在的列
      deleteColumns: ["email"],
    });

    // 验证操作失败，且email列未被删除
    expect(result.type).toBe("failed");
    expect(store.getColumns()).toEqual(currentColumns);
    expect(store.getRecordTotalCount()).toBe(currentRecordCount);
    expect(store.getColumns().some((col) => col.fieldName === "email")).toBe(
      true
    );
  });
});
