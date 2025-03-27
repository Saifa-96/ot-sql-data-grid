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
          operator: { type: "Equals" },
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
          operator: { type: "Equals" },
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
    expect(result).toEqual({
      type: "success",
      sql: {
        type: 'transaction',
        stmts: [
          {
            type: "alter",
            tableName: "main_data",
            column: {
              name: "name_gender",
              datatype: 3,
              default: undefined,
              nullable: undefined,
              primary: false,
            },
            action: "add",
          },
          {
            type: "update",
            tableName: "main_data",
            set: [
              {
                column: "name_gender",
                value: {
                  type: "ConcatExpression",
                  left: {
                    type: "Reference",
                    name: "name",
                  },
                  right: {
                    type: "ConcatExpression",
                    left: {
                      type: "String",
                      value: " (",
                    },
                    right: {
                      type: "ConcatExpression",
                      left: {
                        type: "Reference",
                        name: "gender",
                      },
                      right: {
                        type: "String",
                        value: ")",
                      },
                    },
                  },
                },
              },
            ],
            where: undefined,
          },
          {
            type: "alter",
            tableName: "main_data",
            columnName: "name",
            action: "drop",
          },
          {
            type: "alter",
            tableName: "main_data",
            columnName: "gender",
            action: "drop",
          },
          {
            type: "delete",
            tableName: "columns",
            columnName: "id",
            values: [
              {
                type: "String",
                value: "name",
              },
              {
                type: "String",
                value: "gender",
              },
            ],
          },
          {
            type: "insert",
            tableName: "columns",
            columns: ["id", "field_name", "display_name", "width", "order_by"],
            values: [
              [
                {
                  type: "String",
                  value: "name_gender",
                },
                {
                  type: "String",
                  value: "name_gender",
                },
                {
                  type: "String",
                  value: "Name",
                },
                {
                  type: "Integer",
                  value: 200,
                },
                {
                  type: "Integer",
                  value: 20000,
                },
              ],
            ],
          },
        ],
      },
    });

    const parser2 = new Parser(`
      BEGIN TRANSACTION;
        ALTER TABLE main_data ADD COLUMN name_gender TEXT;
        UPDATE main_data SET name_gender = name || '(' || gender || ')';
        ALTER TABLE main_data DROP COLUMN name;
        ALTER TABLE main_data DROP COLUMN gender;
        DELETE FROM columns WHERE id IN ('name', 'gender');
        INSERT INTO columns (id, field_name, display_name, width, order_by) VALUES ('name_gender', 'name_gender', 'Name(Gender)', 250, 20000);
        UPDATE columns SET order_by = order_by - 10000 WHERE order_by > 20000;
      COMMIT;
    `);
    const result2 = parser2.parse();
    expect(result2).toEqual({
      type: "success",
      sql: {
        type: 'transaction',
        stmts: [
          {
            type: "alter",
            tableName: "main_data",
            column: {
              name: "name_gender",
              default: undefined,
              nullable: undefined,
              datatype: 3,
              primary: false,
            },
            action: "add",
          },
          {
            type: "update",
            tableName: "main_data",
            set: [
              {
                column: "name_gender",
                value: {
                  type: "ConcatExpression",
                  left: {
                    type: "Reference",
                    name: "name",
                  },
                  right: {
                    type: "ConcatExpression",
                    left: {
                      type: "String",
                      value: "(",
                    },
                    right: {
                      type: "ConcatExpression",
                      left: {
                        type: "Reference",
                        name: "gender",
                      },
                      right: {
                        type: "String",
                        value: ")",
                      },
                    },
                  },
                },
              },
            ],
            where: undefined,
          },
          {
            type: "alter",
            tableName: "main_data",
            columnName: "name",
            action: "drop",
          },
          {
            type: "alter",
            tableName: "main_data",
            columnName: "gender",
            action: "drop",
          },
          {
            type: "delete",
            tableName: "columns",
            columnName: "id",
            values: [
              {
                type: "String",
                value: "name",
              },
              {
                type: "String",
                value: "gender",
              },
            ],
          },
          {
            type: "insert",
            tableName: "columns",
            columns: ["id", "field_name", "display_name", "width", "order_by"],
            values: [
              [
                {
                  type: "String",
                  value: "name_gender",
                },
                {
                  type: "String",
                  value: "name_gender",
                },
                {
                  type: "String",
                  value: "Name(Gender)",
                },
                {
                  type: "Integer",
                  value: 250,
                },
                {
                  type: "Integer",
                  value: 20000,
                },
              ],
            ],
          },
          {
            type: "update",
            tableName: "columns",
            set: [
              {
                column: "order_by",
                value: {
                  type: "BinaryExpression",
                  operator: {
                    type: "Minus",
                  },
                  left: {
                    type: "Reference",
                    name: "order_by",
                  },
                  right: {
                    type: "Integer",
                    value: 10000,
                  },
                },
              },
            ],
            where: {
              type: "BinaryExpression",
              operator: {
                type: "GreaterThan",
              },
              left: {
                type: "Reference",
                name: "order_by",
              },
              right: {
                type: "Integer",
                value: 20000,
              },
            },
          },
        ],
      },
    });
  });
});
