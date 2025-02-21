import { Database } from "sql.js";
import { Column, columnSchema } from "./schema";

export function createTable(
  db: Database,
  tableName: string,
  columns: { name: string; type?: string }[]
) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        ${columns.map((col) => `${col.name} ${col.type ?? "TEXT"}`).join(",")},
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
`;
  db.run(createTableQuery);
}

export function getHeader(db: Database, tableName: string): Column[] {
  const header: Column[] = [];
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  while (stmt.step()) {
    const colData = stmt.getAsObject();
    const { success, data } = columnSchema.safeParse(colData);
    if (success) {
      header.push(data);
    }
  }
  stmt.free();
  return header;
}

export function getTotalCount(db: Database, tableName: string) {
  const stmt = db.prepare(`SELECT COUNT(*) FROM ${tableName}`);
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  return result["COUNT(*)"];
}

export function queryRowsByPage(
  db: Database,
  tableName: string,
  page: number,
  size: number
): object[] {
  const offset = (page - 1) * size;
  const sql = `SELECT * FROM ${tableName} LIMIT ${size} OFFSET ${offset}`;
  const stmt = db.prepare(sql);
  const rows: object[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function insertRows(
  db: Database,
  tableName: string,
  columns: string[],
  values: (string | number | null)[][]
) {
  const stmt = db.prepare(
    `INSERT INTO ${tableName} (${columns.join()}) VALUES (${columns
      .map(() => "?")
      .join(",")})`
  );
  values.forEach((row) => stmt.run(row));
  stmt.free();
}

export function deleteRows(
  db: Database,
  tableName: string,
  key: string,
  ids: string[]
) {
  db.run(
    `DELETE FROM ${tableName} WHERE ${key} IN (${ids
      .map((i) => `"${i}"`)
      .join(",")})`
  );
}

export function insertColumn(
  db: Database,
  tableName: string,
  column: string,
  type: string = "TEXT"
) {
  db.run(`ALTER TABLE ${tableName} ADD COLUMN ${column} ${type}`);
}

export function deleteColumns(
  db: Database,
  tableName: string,
  columns: string[]
) {
  columns.forEach((id) => db.run(`ALTER TABLE ${tableName} DROP COLUMN ${id}`));
}

export function updateCell(
  db: Database,
  tableName: string,
  primaryKey: string,
  id: string,
  col: string,
  value: string | null | number
) {
  db.run(
    `UPDATE ${tableName} SET ${col} = "${value}" WHERE ${primaryKey} = "${id}"`
  );
}

export function queryAllRows(db: Database, tableName: string): object[] {
  const stmt = db.prepare(`SELECT * FROM ${tableName}`);
  const rows: object[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}
