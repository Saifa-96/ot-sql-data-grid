import { isClientSymbol, Operation, Server } from "operational-transformation";
import { SQLStore } from "sql-store";
import initSQL from "sql.js";
import z, { symbol } from "zod";
import { defaultColumnItems, defaultTableData } from "./faker-data";
import { faker } from "@faker-js/faker";

export class OTServer extends Server {
  sqlStore: SQLStore;

  constructor(sqlStore: SQLStore) {
    super();
    this.sqlStore = sqlStore;
  }

  static async new() {
    try {
      const sql = await initSQL();
      const db = new sql.Database();
      const sqlStore = new SQLStore(db);
      sqlStore.init(
        defaultColumnItems,
        defaultTableData.ids,
        defaultTableData.values
      );
      return new OTServer(sqlStore);
    } catch (err) {
      console.log(err);
    }
  }

  applyOperation(operation: Operation) {
    this.sqlStore.execOperation(operation);
  }

  toBuffer() {
    const dbU8Arr = this.sqlStore.db.export();
    const revision = this.getRevision();
    return new Uint8Array([revision, ...dbU8Arr]);
  }

  validateOperation(op: unknown): {
    operation: Operation;
    identityRecord: Record<string, string>;
  } {
    const parsed = operationSchema.safeParse(op);
    if (parsed.success) {
      return parsed.data;
    } else {
      console.error("Invalid operation format", parsed.error);
      throw new Error("Invalid operation format");
    }
  }
}

const identitySchema = z.union([
  z.object({
    uuid: z.string(),
    symbol: z.string().optional(),
  }),
  z.object({
    symbol: z.string(),
  }),
]);

const recordChangesSchema = z.object({
  ids: z.array(identitySchema),
  columns: z.array(z.string()),
  values: z.array(z.array(z.string())),
});

const columnChangesSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  width: z.number(),
  orderBy: z.number(),
});

const operationSchema = z
  .object({
    insertRecords: z.array(recordChangesSchema).optional(),
    deleteRecords: z.array(identitySchema).optional(),
    updateRecords: z.array(recordChangesSchema).optional(),
    insertColumns: z.record(columnChangesSchema).optional(),
    deleteColumns: z.array(z.string()).optional(),
    updateColumns: z.record(columnChangesSchema.partial()).optional(),
  })
  .transform((data) => {
    const identityRecord: Record<string, string> = {};
    const operation = { ...data };

    if (operation.insertRecords) {
      operation.insertRecords = operation.insertRecords.map((record) => {
        const ids = record.ids.map((id) => {
          if (isClientSymbol(id)) {
            const uuid = generateUUID();
            identityRecord[id.symbol] = uuid;
            return { uuid, symbol: id.symbol };
          } else {
            return id;
          }
        });
        return { ...record, ids };
      });
    }

    if (operation.deleteRecords) {
      operation.deleteRecords = operation.deleteRecords.map((id) => {
        if (isClientSymbol(id)) {
          const uuid = generateUUID();
          identityRecord[id.symbol] = uuid;
          return { uuid, symbol: id.symbol };
        } else {
          return id;
        }
      });
    }

    if (operation.updateRecords) {
      operation.updateRecords = operation.updateRecords.map((record) => {
        const ids = record.ids.map((id) => {
          if (isClientSymbol(id)) {
            const uuid = generateUUID();
            identityRecord[id.symbol] = uuid;
            return { uuid, symbol: id.symbol };
          } else {
            return id;
          }
        });
        return { ...record, ids };
      });
    }

    return {
      operation,
      identityRecord,
    };
  });

const generateUUID = (): string => {
  return faker.string.uuid();
};
