import { z } from "zod";

export type Column = z.infer<typeof columnSchema>;
export const columnSchema = z.object({
  primary: z.union([z.literal(0), z.literal(1)]),
  displayName: z.string(),
  fieldName: z.string(),
  fieldType: z.string().optional(),
  order: z.number(),
  width: z.number(),
});

export type InitEventPayload = z.infer<typeof initEventPayloadSchema>;
export const initEventPayloadSchema = z.object({
  type: z.literal("initialize"),
  columns: z.array(columnSchema),
  data: z.array(z.array(z.union([z.string(), z.number()]))),
});

export type GetHeaderPayload = z.infer<typeof getHeaderPayloadSchema>;
export const getHeaderPayloadSchema = z.object({
  type: z.literal("get-header"),
});

export type QueryRowsPayload = z.infer<typeof queryRowsPayloadSchema>;
export const queryRowsPayloadSchema = z.object({
  type: z.literal("query-rows"),
  page: z.number(),
  size: z.number(),
});

export type EventPayload = z.infer<typeof eventPayloadSchema>;
export const eventPayloadSchema = z.union([
  initEventPayloadSchema,
  getHeaderPayloadSchema,
  queryRowsPayloadSchema,
]);
