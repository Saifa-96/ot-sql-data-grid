import { z } from "zod";

export const columnSchema = z
  .object({
    field_name: z.string(),
    display_name: z.string(),
    width: z.number().default(200),
    orderBy: z.string(),
  })
  .transform((o) => ({
    fieldName: o.field_name,
    displayName: o.display_name,
    width: o.width,
    orderBy: o.orderBy,
  }));

export type Column = z.infer<typeof columnSchema>;
