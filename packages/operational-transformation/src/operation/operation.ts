import { type Identity } from "./identity";
import { RecordChanges } from "./record-changes-collection";

export interface Operation {
  // DML
  updateRecords?: RecordChanges[];
  insertRecords?: RecordChanges[];
  deleteRecords?: Identity[];
  // DDL
  updateColumns?: Record<string, Partial<ColumnChanges>>;
  insertColumns?: Record<string, ColumnChanges>;
  deleteColumns?: string[];
}

export interface ColumnChanges {
  name: string;
  width: number;
  displayName: string;
  orderBy: number;
}
