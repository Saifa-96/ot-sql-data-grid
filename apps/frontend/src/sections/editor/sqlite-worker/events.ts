import { OpfsDatabase } from "@sqlite.org/sqlite-wasm";
import { DATA_TABLE, HEADER_TABLE } from "./constants";
import { InitEventPayload } from "./payload-schema";
import { createTable, insertMultipleRows } from "./statement";

const headerTableColumn: {
  fieldName: string;
  fieldType: string;
  primary: 1 | 0;
}[] = [
  { fieldName: "fieldName", fieldType: "TEXT", primary: 1 },
  { fieldName: "fieldType", fieldType: "TEXT", primary: 0 },
  { fieldName: "label", fieldType: "TEXT", primary: 0 },
  { fieldName: "order", fieldType: "INT", primary: 0 },
  { fieldName: "width", fieldType: "INT", primary: 0 },
];

export const initializeDB = (db: OpfsDatabase, payload: InitEventPayload) => {
  const { columns, data } = payload;

  createTable(db, DATA_TABLE, columns);
  insertMultipleRows(db, {
    tableName: DATA_TABLE,
    columns: columns.map((c) => c.fieldName),
    rows: data,
  });

  createTable(db, HEADER_TABLE, headerTableColumn);
  insertMultipleRows(db, {
    tableName: HEADER_TABLE,
    columns: headerTableColumn.map((c) => c.fieldName),
    rows: columns.map((col) =>
      headerTableColumn.map((h) => col[h.fieldName as keyof typeof col] ?? null)
    ),
  });
};
