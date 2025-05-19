import { de, faker } from "@faker-js/faker";
import { describe, test, expect } from "vitest";
import initSqlJs from "sql.js";
import {
  ColumnItem,
  SQLStore,
  COLUMN_TABLE_NAME,
  DATA_TABLE_NAME,
  TableSettings,
} from "./sql-store";
import { v4 as uuid } from "uuid";
import { Operation } from "operational-transformation";

const defaultColumnItems: ColumnItem[] = [
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
const mockData = Array(1000).fill(null).map(generateRow);
const ids = Array(1000)
  .fill(null)
  .map(() => uuid());

const initSQLStore = async () => {
  const sql = await initSqlJs();
  const db = new sql.Database();
  const sqlStore = new SQLStore(db);
  sqlStore.init(defaultColumnItems, ids, mockData);
  return sqlStore;
};

const defaultTableSettings: {
  columnTableName: string;
  dataTableName: string;
  columnTable: TableSettings;
  dataTable: TableSettings;
  header: ColumnItem[];
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
      name: "name",
      type: "STRING",
      nullable: true,
      defaultValue: null,
      primaryKey: false,
    },
    {
      cid: 2,
      name: "age",
      type: "STRING",
      nullable: true,
      defaultValue: null,
      primaryKey: false,
    },
    {
      cid: 3,
      name: "address",
      type: "STRING",
      nullable: true,
      defaultValue: null,
      primaryKey: false,
    },
    {
      cid: 4,
      name: "create_time",
      type: "DATETIME",
      nullable: false,
      defaultValue: "CURRENT_TIMESTAMP",
      primaryKey: false,
    },
  ],
  header: [
    {
      displayName: "Name",
      fieldName: "name",
      orderBy: 20000,
      width: 200,
    },
    {
      displayName: "Age",
      fieldName: "age",
      orderBy: 10000,
      width: 150,
    },
    {
      displayName: "Address",
      fieldName: "address",
      orderBy: 30000,
      width: 300,
    },
  ],
};

describe("Test SQL Store", () => {
  test("Test init SQL Store", async () => {
    const sqlStore = await initSQLStore();
    const result = sqlStore.getSettings();
    expect(result).toEqual(defaultTableSettings);
  });

  test("Test modifying columns table", async () => {
    let currentTableSettings = defaultTableSettings;
    const sqlStore = await initSQLStore();
    const newColumns = [
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
    ];

    // 1. Test adding repeated columns
    const addRepeatedColumnsResult = sqlStore.addColumns([
      defaultColumnItems[0],
    ]);
    expect(addRepeatedColumnsResult).toBe(false);
    expect(sqlStore.getColumns()).toEqual(defaultColumnItems);
    expect(sqlStore.getSettings()).toEqual(currentTableSettings);

    currentTableSettings = {
      ...defaultTableSettings,
      dataTable: [
        ...defaultTableSettings.dataTable,
        {
          cid: 5,
          defaultValue: null,
          name: "email",
          nullable: true,
          primaryKey: false,
          type: "STRING",
        },
        {
          cid: 6,
          defaultValue: null,
          name: "phone",
          nullable: true,
          primaryKey: false,
          type: "STRING",
        },
      ],
      header: [
        ...defaultColumnItems,
        {
          displayName: "Email",
          fieldName: "email",
          orderBy: 40000,
          width: 200,
        },
        {
          displayName: "Phone",
          fieldName: "phone",
          orderBy: 50000,
          width: 200,
        },
      ],
    };

    // 2. Test adding new columns
    const addColumnsResult = sqlStore.addColumns(newColumns);
    expect(addColumnsResult).toBe(true);
    expect(sqlStore.getColumns()).toEqual([
      ...defaultColumnItems,
      ...newColumns,
    ]);
    expect(sqlStore.getSettings()).toEqual(currentTableSettings);

    // 3. Test deleting non-existing columns
    const deleteNonExistingColumnsResult = sqlStore.dropColumns([
      "non_existing_column",
    ]);
    expect(deleteNonExistingColumnsResult).toBe(false);
    expect(sqlStore.getColumns()).toEqual([
      ...defaultColumnItems,
      ...newColumns,
    ]);
    expect(sqlStore.getSettings()).toEqual(currentTableSettings);

    // 4. Test deleting existing columns
    const deleteColumnsResult = sqlStore.dropColumns(["email", "age"]);
    expect(deleteColumnsResult).toBe(true);
    expect(sqlStore.getColumns()).toEqual(
      [...defaultColumnItems, ...newColumns].filter(
        (i) => !["email", "age"].includes(i.fieldName)
      )
    );
    currentTableSettings = {
      ...currentTableSettings,
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
          name: "name",
          type: "STRING",
          nullable: true,
          defaultValue: null,
          primaryKey: false,
        },
        {
          cid: 2,
          name: "address",
          type: "STRING",
          nullable: true,
          defaultValue: null,
          primaryKey: false,
        },
        {
          cid: 3,
          name: "create_time",
          type: "DATETIME",
          nullable: false,
          defaultValue: "CURRENT_TIMESTAMP",
          primaryKey: false,
        },
        {
          cid: 4,
          name: "phone",
          type: "STRING",
          nullable: true,
          defaultValue: null,
          primaryKey: false,
        },
      ],
      header: [
        {
          displayName: "Name",
          fieldName: "name",
          orderBy: 20000,
          width: 200,
        },
        {
          displayName: "Address",
          fieldName: "address",
          orderBy: 30000,
          width: 300,
        },
        {
          displayName: "Phone",
          fieldName: "phone",
          orderBy: 50000,
          width: 200,
        },
      ],
    };
    expect(sqlStore.getSettings()).toEqual(currentTableSettings);

    // 5. Test updating non-existing columns
    const updateNonExistingColumnsResult = sqlStore.updateColumns(
      ["non_existing_column"],
      [
        {
          displayName: "New Name",
          width: 300,
          orderBy: 60000,
        },
      ]
    );
    expect(updateNonExistingColumnsResult).toBe(false);
    expect(sqlStore.getColumns()).toEqual(
      [...defaultColumnItems, ...newColumns].filter(
        (i) => !["email", "age"].includes(i.fieldName)
      )
    );

    // 6. Test updating existing columns
    const updateColumnsResult = sqlStore.updateColumns(
      ["name"],
      [
        {
          displayName: "New Name",
          width: 300,
          orderBy: 60000,
        },
      ]
    );
    expect(updateColumnsResult).toBe(true);
    expect(sqlStore.getColumns()).toEqual(
      [...defaultColumnItems, ...newColumns]
        .map((i) =>
          i.fieldName === "name"
            ? { ...i, displayName: "New Name", width: 300, orderBy: 60000 }
            : i
        )
        .filter((i) => !["email", "age"].includes(i.fieldName))
    );
  });

  test("Test modify data table", async () => {
    const sqlStore = await initSQLStore();

    const defaultColumns = defaultColumnItems.map((i) => i.fieldName);
    const newData = Array(2).fill(null).map(generateRow);

    // 1. Test inserting records
    const insertRepeatedRecordsResult = sqlStore.insertRecords(
      [faker.string.uuid(), faker.string.uuid()],
      defaultColumns,
      newData
    );
    expect(insertRepeatedRecordsResult).toBe(true);
    expect(sqlStore.getRecordTotalCount()).toBe(
      mockData.length + newData.length
    );

    // 2. Test inserting records with non-existing columns
    const insertNonExistingColumnsResult = sqlStore.insertRecords(
      ["1"],
      ["non_existing_column"],
      [["value"]]
    );
    expect(insertNonExistingColumnsResult).toBe(false);

    // 3. Test getting records by page
    const records = sqlStore.getRecordsByPage(1, 1000) as { id: string }[];
    expect(records.length).toBe(1000);
    expect(records[0]).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      age: expect.any(Number),
      address: expect.any(String),
      create_time: expect.any(String),
    });
    const nextRecords = sqlStore.getRecordsByPage(2, 1000) as { id: string }[];
    expect(nextRecords.length).toBe(2);

    // 4. Test updating records
    const updateRecordsResult = sqlStore.updateRecords(
      ["id", "name", "age"],
      [
        [nextRecords[0].id, "Updated Name", 30],
        [nextRecords[1].id, "Updated Name 2", 35],
      ]
    );
    expect(updateRecordsResult).toBe(true);
    const updatedResult = sqlStore.getRecordsByPage(2, 1000);
    expect(updatedResult).toEqual([
      {
        id: expect.any(String),
        name: "Updated Name",
        age: 30,
        address: expect.any(String),
        create_time: expect.any(String),
      },
      {
        id: expect.any(String),
        name: "Updated Name 2",
        age: 35,
        address: expect.any(String),
        create_time: expect.any(String),
      },
    ]);

    // 5. Delete records
    const deleteRecordsResult = sqlStore.deleteRecords([
      records[0].id,
      nextRecords[1].id,
    ]);
    expect(deleteRecordsResult).toBe(true);
    expect(sqlStore.getRecordTotalCount()).toBe(1000);
    expect(sqlStore.getRecordsByPage(1, 1)).not.toEqual(records[0]);
    const lastPage = sqlStore.getRecordsByPage(500, 2) as { id: string }[];
    expect(lastPage[1]).toEqual({
      id: expect.any(String),
      name: "Updated Name",
      age: 30,
      address: expect.any(String),
      create_time: expect.any(String),
    });
  });

  test("Test execOperation method", async () => {
    const sqlStore = await initSQLStore();
    const [firstRow, secondRow, thirdRow] = sqlStore.getRecordsByPage(1, 3) as {
      id: string;
    }[];
    const newValues = [
      [faker.person.fullName(), faker.location.streetAddress()],
      [faker.person.fullName(), faker.location.streetAddress()],
    ];

    const operation: Operation = {
      insertColumns: {
        email: {
          name: "email",
          displayName: "Email",
          width: 200,
          orderBy: 40000,
        },
      },
      deleteColumns: ["age"],
      updateColumns: {
        name: {
          name: "name",
          displayName: "New Name",
          width: 300,
          orderBy: 60000,
        },
      },
      insertRecords: [
        {
          ids: [{ symbol: "1" }, { symbol: "2" }],
          columns: ["name"],
          values: [[faker.person.fullName()], [faker.person.fullName()]],
        },
      ],
      deleteRecords: [{ uuid: firstRow.id }],
      updateRecords: [
        {
          ids: [{ symbol: secondRow.id }, { symbol: thirdRow.id }],
          columns: ["name", "address"],
          values: newValues,
        },
      ],
    };

    sqlStore.execOperation(operation);
    expect(sqlStore.getColumns()).toEqual([
      {
        fieldName: "name",
        width: 300,
        displayName: "New Name",
        orderBy: 60000,
      },
      {
        fieldName: "address",
        width: 300,
        displayName: "Address",
        orderBy: 30000,
      },
      {
        fieldName: "email",
        width: 200,
        displayName: "Email",
        orderBy: 40000,
      },
    ]);

    expect(sqlStore.getRecordTotalCount()).toBe(1001);

    const settings = sqlStore.getSettings();
    expect(settings.dataTable).toEqual([
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
        name: "name",
        type: "STRING",
        nullable: true,
        defaultValue: null,
        primaryKey: false,
      },
      {
        cid: 2,
        name: "address",
        type: "STRING",
        nullable: true,
        defaultValue: null,
        primaryKey: false,
      },
      {
        cid: 3,
        name: "create_time",
        type: "DATETIME",
        nullable: false,
        defaultValue: "CURRENT_TIMESTAMP",
        primaryKey: false,
      },
      {
        cid: 4,
        name: "email",
        type: "STRING",
        nullable: true,
        defaultValue: null,
        primaryKey: false,
      },
    ]);

    const [newFirstRow, newSecondRow] = sqlStore.getRecordsByPage(1, 3) as {
      id: string;
      name: string;
      address: string;
    }[];
    expect(Object.hasOwn(newFirstRow, "age")).toBe(false);
    expect(newFirstRow.id).not.toEqual(firstRow.id);
    expect(newFirstRow.id).toEqual(secondRow.id);
    expect(newFirstRow.name).toEqual(newValues[0][0]);
    expect(newFirstRow.address).toEqual(newValues[0][1]);

    expect(newSecondRow.id).toEqual(thirdRow.id);
    expect(newSecondRow.name).toEqual(newValues[1][0]);
    expect(newSecondRow.address).toEqual(newValues[1][1]);
  });

  test("Test performance", async () => {
    const sqlStore = await initSQLStore();
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
          name: "gender",
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
    sqlStore.execOperation(operation);
    const end = performance.now();
    console.log("Performance test took: ", end - start, "ms");
    expect(sqlStore.getRecordTotalCount()).toBe(30000 + mockData.length);
  });
});
