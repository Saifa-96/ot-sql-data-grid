import { describe, expect, test } from "@jest/globals";
import { Parser } from "./index";
import { DataType } from "./ast";

describe("Test Parser", () => {
  test("Test simple create table sql text", () => {
    const parser = new Parser(`
        create table tbl (
            id1 int primary key,
            id2 integer
            );`);
    const result = parser.parse();

    expect(result).toEqual({
      type: "success",
      sql: {
        type: "create-table",
        name: "tbl",
        columns: [
          {
            datatype: DataType.Integer,
            default: undefined,
            name: "id1",
            nullable: undefined,
            primary: true,
          },
          {
            datatype: DataType.Integer,
            default: undefined,
            name: "id2",
            nullable: undefined,
            primary: false,
          },
        ],
      },
    });
  });

  test("test complicated create table sql text", () => {
    const parser = new Parser(`
        create table tbl (
            id1 int primary key,
            id2 integer not null,
            id3 float default 1.0
            );`);
    const result = parser.parse();

    expect(result).toEqual({
      type: "success",
      sql: {
        type: "create-table",
        name: "tbl",
        columns: [
          {
            datatype: DataType.Integer,
            default: undefined,
            name: "id1",
            nullable: undefined,
            primary: true,
          },
          {
            datatype: DataType.Integer,
            default: undefined,
            name: "id2",
            nullable: false,
            primary: false,
          },
          {
            datatype: DataType.Float,
            default: { type: "Float", value: 1.0 },
            name: "id3",
            nullable: undefined,
            primary: false,
          },
        ],
      },
    });
  });

  test("Test simple insert sql text", () => {
    const parser = new Parser(`
        insert into tbl (id1, id2) values (1, 2);`);
    const result = parser.parse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "insert",
        tableName: "tbl",
        columns: ["id1", "id2"],
        values: [
          [
            { type: "Integer", value: 1 },
            { type: "Integer", value: 2 },
          ],
        ],
      },
    });
  });

  test("Test complicated insert sql text", () => {
    const parser = new Parser(`
        insert into tbl (id1, id2) values (1, 2), (true, null);`);
    const result = parser.parse();

    expect(result).toEqual({
      type: "success",
      sql: {
        type: "insert",
        tableName: "tbl",
        columns: ["id1", "id2"],
        values: [
          [
            { type: "Integer", value: 1 },
            { type: "Integer", value: 2 },
          ],
          [{ type: "Boolean", value: true }, { type: "Null" }],
        ],
      },
    });
  });

  test("Test simple select sql text", () => {
    const parser = new Parser(`select * from tbl;`);
    const result = parser.parse();

    expect(result).toEqual({
      type: "success",
      sql: {
        type: "select",
        tableName: "tbl",
      },
    });
  });

  test("Test simple alter table sql text", () => {
    const parser = new Parser(`alter table tbl add column id int;`);
    const result = parser.parse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "alter",
        tableName: "tbl",
        column: {
          datatype: 1,
          default: undefined,
          name: "id",
          nullable: undefined,
          primary: false,
        },
        action: "add",
      },
    });

    const parser2 = new Parser(`alter table tbl drop column id;`);
    const result2 = parser2.parse();
    expect(result2).toEqual({
      type: "success",
      sql: {
        type: "alter",
        tableName: "tbl",
        columnName: "id",
        action: "drop",
      },
    });
  });

  test("Test simple delete sql text", () => {
    const parser = new Parser(`delete from tbl where id in (1);`);
    const result = parser.parse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "delete",
        tableName: "tbl",
        columnName: "id",
        values: [{ type: "Integer", value: 1 }],
      },
    });
  });

  test("Test simple update sql text", () => {
    const parser = new Parser(
      `update tbl set id = 1, test = "123123" where name = 1;`
    );
    const result = parser.parse();
    expect(result).toEqual({
      type: "success",
      sql: {
        type: "update",
        tableName: "tbl",
        set: [
          {
            column: "id",
            value: {
              type: "Integer",
              value: 1,
            },
          },
          {
            column: "test",
            value: {
              type: "String",
              value: "123123",
            },
          },
        ],
        where: {
          type: "BinaryExpression",
          left: {
            name: "name",
            type: "Reference",
          },
          operator: "=",
          right: {
            type: "Integer",
            value: 1,
          },
        },
      },
    });

    const parser2 = new Parser(`update tbl set id = 1 where name = 1;`);
    const result2 = parser2.parse();
    expect(result2).toEqual({
      type: "success",
      sql: {
        type: "update",
        tableName: "tbl",
        set: [
          {
            column: "id",
            value: {
              type: "Integer",
              value: 1,
            },
          },
        ],
        where: {
          left: {
            name: "name",
            type: "Reference",
          },
          operator: "=",
          right: {
            type: "Integer",
            value: 1,
          },
          type: "BinaryExpression",
        },
      },
    });
  });

  test("Test Transaction", () => {
    const parser = new Parser(`
      BEGIN TRANSACTION;
        ALTER TABLE main_data ADD COLUMN name_gender TEXT;
        UPDATE main_data SET name_gender = name || ' (' || gender || ')';
        ALTER TABLE main_data DROP COLUMN name;
        ALTER TABLE main_data DROP COLUMN gender;
        DELETE FROM columns WHERE id IN ('name', 'gender');
        INSERT INTO columns (id, field_name, display_name, width, order_by) VALUES ('name_gender', 'name_gender', 'Name', 200, 20000);
      COMMIT;
    `);
    const result = parser.parse();
    // if (result.type === "success") {
    //   console.log(result.sql);
    // } else {
    //   console.log(result.err);
    // }
  });
});
