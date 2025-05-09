import { Operation } from "operational-transformation";

export const updateRecordProperty = (
  rowId: string,
  columnName: string,
  value: string
): Operation => ({
  updateRecords: [
    {
      ids: [{ uuid: rowId }],
      columns: [columnName],
      values: [[value]],
    },
  ],
});

export const deleteRecord = (rowId: string): Operation => ({
  deleteRecords: [{ uuid: rowId }],
});

export const insertRecord = (
  id: string,
  data: Record<string, unknown>
): Operation => ({
  insertRecords: [
    {
      ids: [{ symbol: id }],
      columns: Object.keys(data),
      values: [Object.values(data) as string[]],
    },
  ],
});

export const insertColumn = (data: Record<string, unknown>): Operation => ({
  insertColumns: {
    [data["fieldName"] as string]: {
      name: data["fieldName"] as string,
      displayName: data["displayName"] as string,
      width: (data["width"] as number) ?? 150,
      orderBy: (data["orderBy"] as number) ?? 10100,
    },
  },
});

export const deleteColumn = (columnName: string): Operation => ({
  deleteColumns: [columnName],
});
