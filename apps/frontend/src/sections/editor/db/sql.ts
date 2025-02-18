import { Database, SqlValue } from "sql.js";
import { z } from "zod";

export function isTableExists(db: Database, tableName: string): boolean {
  const stmt = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
  );
  const result = stmt.step();
  stmt.free();
  return result;
}

export function createTable(
  db: Database,
  tableName: string,
  columns: string[],
  primaryKey: string
) {
  db.run(
    `CREATE TABLE IF NOT EXISTS ${tableName} (${columns
      .map((name) => `${name} TEXT${primaryKey === name ? " PRIMARY KEY" : ""}`)
      .join(",")})`
  );
}

export function insertRows(
  db: Database,
  tableName: string,
  columns: string[],
  values: string[][]
) {
  const stmt = db.prepare(
    `INSERT INTO ${tableName} VALUES (${columns.map(() => "?").join(",")})`
  );
  values.forEach((row) => stmt.run(row));
  stmt.free();
}

export function queryRows(db: Database, sql: string): Map<string, SqlValue>[] {
  const stmt = db.prepare(sql);
  const rows: Map<string, SqlValue>[] = [];
  while (stmt.step()) {
    const obj = stmt.getAsObject();
    const map = new Map(Object.entries(obj));
    rows.push(map);
  }
  stmt.free();
  return rows;
}

interface Column {
  cid: number;
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

export function getHeader(db: Database, tableName: string): Column[] {
  const header: Column[] = [];
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  while (stmt.step()) {
    const colData = stmt.getAsObject();
    const { success, data } = columnSchema.safeParse(colData);
    if (success) {
      header.push(toColumn(data));
    }
  }
  stmt.free();
  return header;
}

const columnSchema = z.object({
  cid: z.number(),
  name: z.string(),
  type: z.enum(["TEXT", "INTEGER", "REAL", "BLOB", "NULL"]),
  notnull: z.number(),
  dflt_value: z.string().nullable(),
  pk: z.number(),
});

const toColumn = (data: z.infer<typeof columnSchema>): Column => ({
  cid: data.cid,
  name: data.name,
  type: data.type,
  nullable: data.notnull === 0,
  defaultValue: data.dflt_value,
  primaryKey: data.pk === 1,
});

export function deleteRows(
  db: Database,
  tableName: string,
  key: string,
  ids: string[]
) {
  db.exec(
    `DELETE FROM ${tableName} WHERE ${key} IN (${ids
      .map((i) => `"${i}"`)
      .join(",")})`
  );
}

export function deleteCols(db: Database, tableName: string, cols: string[]) {
  cols.forEach((id) => db.exec(`ALTER TABLE ${tableName} DROP COLUMN ${id}`));
}

export function insertColumn(db: Database, tableName: string, column: string) {
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${column} TEXT`);
}

export function updateCell(
  db: Database,
  tableName: string,
  primaryKey: string,
  id: string,
  col: string,
  value: string
) {
  db.exec(
    `UPDATE ${tableName} SET ${col} = "${value}" WHERE ${primaryKey} = "${id}"`
  );
}

export function getTotalCount(db: Database, tableName: string): number {
  const stmt = db.prepare(`SELECT COUNT(*) FROM ${tableName}`);
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  return Number(result["COUNT(*)"]);
}
