import { astToString, Column, DataType, Expression } from "sql-parser";
import { z } from "zod";

export const DATA_TABLE_NAME = "main_data";
export const COLUMN_TABLE_NAME = "columns";
export const columnItemSchema = z
  .object({
    field_name: z.string(),
    display_name: z.union([z.string(), z.number()]),
    width: z.number(),
    order_by: z.number(),
  })
  .strip()
  .transform((row) => ({
    fieldName: String(row.field_name),
    // TODO the field will be implicitly transform to number if the value is '123'.
    displayName: String(row.display_name),
    width: row.width,
    orderBy: row.order_by,
  }));

export type TableSettings = z.infer<typeof columnSettingsSchema>[];
export const columnSettingsSchema = z
  .object({
    cid: z.number(),
    name: z.string(),
    type: z.enum([
      "STRING",
      "TEXT",
      "INTEGER",
      "REAL",
      "BLOB",
      "NULL",
      "DATETIME",
    ]),
    notnull: z.number(),
    dflt_value: z.string().nullable(),
    pk: z.number(),
  })
  .transform((data) => ({
    cid: data.cid,
    name: data.name,
    type: data.type,
    nullable: data.notnull === 0,
    defaultValue: data.dflt_value,
    primaryKey: data.pk === 1,
  }));

export const COLUMN_TABLE_HEADER = [
  "field_name",
  "display_name",
  "width",
  "order_by",
];
export const COLUMN_VALUES_PLACEHOLDER = [
  "$fieldName",
  "$displayName",
  "$width",
  "$orderBy",
].map<Expression>((v) => ({
  type: "Reference",
  name: v,
}));

export const INIT_COLUMN_TABLE_SQL = astToString({
  type: "create-table",
  name: COLUMN_TABLE_NAME,
  columns: [
    {
      name: "field_name",
      datatype: DataType.String,
      nullable: false,
      primary: true,
    },
    {
      name: "display_name",
      datatype: DataType.String,
      nullable: false,
      primary: false,
    },
    {
      name: "width",
      datatype: DataType.Integer,
      nullable: false,
      primary: false,
    },
    {
      name: "order_by",
      datatype: DataType.Integer,
      nullable: false,
      primary: false,
    },
  ],
});

export const INIT_DATA_TABLE_SQL = astToString({
  type: "create-table",
  name: DATA_TABLE_NAME,
  columns: [
    {
      name: "id",
      datatype: DataType.String,
      nullable: false,
      primary: true,
    },
    {
      name: "create_time",
      datatype: DataType.Datetime,
      nullable: false,
      primary: false,
      default: { type: "Current_Timestamp" },
    },
  ],
});
