import { z } from "zod";

export const columnSchema = z
  .object({
    cid: z.number(),
    name: z.string(),
    type: z.enum(["TEXT", "INTEGER", "REAL", "BLOB", "NULL", "DATETIME"]),
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

export type Column = z.infer<typeof columnSchema>;
