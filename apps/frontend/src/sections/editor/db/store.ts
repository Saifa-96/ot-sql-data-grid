import { Database, SqlValue } from "sql.js";
import * as sql from "./sql";

export const defaultHeader: { fieldName: string; displayName: string }[] = [
  { fieldName: "id", displayName: "ID" },
  { fieldName: "wid", displayName: "微信ID" },
  { fieldName: "name", displayName: "用户姓名" },
  { fieldName: "gender", displayName: "性别" },
  { fieldName: "phone", displayName: "手机号" },
  { fieldName: "email", displayName: "邮箱" },
  { fieldName: "birthday", displayName: "生日" },
  { fieldName: "create_time", displayName: "创建时间" },
];

export function getUsersByPage(
  db: Database,
  page: number,
  size: number = 50
): Map<string, SqlValue>[] {
  const offset = page - 1;
  const rows = sql.queryRows(
    db,
    `SELECT * FROM user LIMIT ${size} OFFSET ${offset * size}`
  );
  return rows;
}

export function getHeader(db: Database) {
  return sql.queryRows(db, `SELECT * FROM header`);
}

export function deleteUsers(db: Database, ids: string[]) {
  sql.deleteRows(db, "user", "id", ids);
}

export function deleteCols(db: Database, cols: string[]) {
  sql.deleteRows(db, "header", "field_name", cols);
  sql.deleteCols(db, "user", cols);
}

export function insertColumn(
  db: Database,
  fieldName: string,
  displayName: string
) {
  sql.insertRows(
    db,
    "header",
    ["field_name", "display_name", "orderBy"],
    [[fieldName, displayName, "a"]]
  );
  sql.insertColumn(db, "user", fieldName);
}

export function addUsers(db: Database, users: object[]) {
  const header = sql.getHeader(db, "user");
  const columnList = header.map((col) => col.name);
  const rows = users.map((user) =>
    columnList.map((col) => user[col as keyof typeof user] ?? null)
  );
  sql.insertRows(db, "user", columnList, rows);
}

export function updateUserAttr(
  db: Database,
  col: string,
  row: string,
  value: string
) {
  sql.updateCell(db, "user", "id", row, col, value);
}

export function getUserCount(db: Database): number {
  return sql.getTotalCount(db, "user");
}
