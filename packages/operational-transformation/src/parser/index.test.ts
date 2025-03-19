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

    expect(result.type === "success").toBeTruthy();
    if (result.type === "success") {
      expect(result.stmt).toEqual({
        type: "CreateTable",
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
      });
    }
  });

  test("test complicated create table sql text", () => {
    const parser = new Parser(`
        create table tbl (
            id1 int primary key,
            id2 integer not null,
            id3 float default 1.0
            );`);
    const result = parser.parse();

    expect(result.type === "success").toBeTruthy();
    if (result.type === "success") {
      expect(result.stmt).toEqual({
        type: "CreateTable",
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
      });
    }
  });

  test("Test simple insert sql text", () => {
    const parser = new Parser(`
        insert into tbl (id1, id2) values (1, 2);`);
    const result = parser.parse();

    expect(result.type === "success").toBeTruthy();
    if (result.type === "success") {
      expect(result.stmt).toEqual({
        type: "Insert",
        tableName: "tbl",
        columns: ["id1", "id2"],
        values: [
          [
            { type: "Integer", value: 1 },
            { type: "Integer", value: 2 },
          ],
        ],
      });
    }
  });

  test("Test complicated insert sql text", () => {
    const parser = new Parser(`
        insert into tbl (id1, id2) values (1, 2), (3, 4);`);
    const result = parser.parse();

    expect(result.type === "success").toBeTruthy();
    if (result.type === "success") {
      expect(result.stmt).toEqual({
        type: "Insert",
        tableName: "tbl",
        columns: ["id1", "id2"],
        values: [
          [
            { type: "Integer", value: 1 },
            { type: "Integer", value: 2 },
          ],
          [
            { type: "Integer", value: 3 },
            { type: "Integer", value: 4 },
          ],
        ],
      });
    }
  });

  test("Test simple select sql text", () => {
    const parser = new Parser(`
        select * from tbl;`);
    const result = parser.parse();

    expect(result.type === "success").toBeTruthy();
    if (result.type === "success") {
      expect(result.stmt).toEqual({
        type: "Select",
        tableName: "tbl",
      });
    }
  });
});
