import { OpfsDatabase, SqlValue } from "@sqlite.org/sqlite-wasm";


export const createTable = (
  db: OpfsDatabase,
  tableName: string,
  columns: { fieldName: string; fieldType?: string; primary: 1 | 0 }[]
) => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columns
          .map(
            (col) =>
              `${col.fieldName} ${col.fieldType ?? "TEXT"} ${
                col.primary ? "PRIMARY KEY" : ""
              }`
          )
          .join(",")},
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
`;

  db.exec(createTableQuery);
};

const parseColumns = (columns?: string[]) => {
  return Array.isArray(columns) ? `(${columns.join(",")})` : "";
};

export const insertMultipleRows = (
  db: OpfsDatabase,
  params: {
    tableName: string;
    rows: SqlValue[][];
    columns: string[];
  }
) => {
  const { tableName, columns, rows } = params;
  const sql = `
  INSERT INTO ${tableName} 
  ${parseColumns(columns)}
   VALUES ${rows.map((row) => `(${row.join()})`).join()}};
  `;

  db.exec(sql);
};

export const insertRow = (
  db: OpfsDatabase,
  params: {
    tableName: string;
    data: SqlValue[];
    columns?: string[];
  }
) => {
  const { tableName, columns, data } = params;
  const sql = `
  INSERT INTO ${tableName} 
  ${parseColumns(columns)}
   VALUES (${data.join(",")}});
  `;

  db.exec({
    sql,
    bind: data,
  });
};

export const getHeader = (db: OpfsDatabase, tableName: string) => {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  try {
    while (stmt.step()) {
      const dataItem = {};
      stmt.get(dataItem);
      console.log(dataItem);
    }
  } catch (e) {
    throw e;
  } finally {
    stmt.finalize();
  }
};
