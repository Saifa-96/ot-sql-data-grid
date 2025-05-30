import { Identity, identityToString } from "./identity";

type ColumnValue = string | number | null;

export interface RecordChanges {
  ids: Identity[];
  columns: string[];
  values: ColumnValue[][];
}

export class RecordChangesCollection {
  private _collection: Map<
    string,
    { id: Identity; record: Record<string, ColumnValue> }
  >;
  private _deleteRecords: Map<string, Identity>;
  private _deleteColumns: Set<string>;

  constructor(changesArray: RecordChanges[] = []) {
    this._collection = this._toCollection(changesArray);
    this._deleteRecords = new Map();
    this._deleteColumns = new Set();
  }

  private _toCollection(changesArray: RecordChanges[]) {
    const collection = new Map<
      string,
      { id: Identity; record: Record<string, ColumnValue> }
    >();

    changesArray.forEach((changes) => {
      const { ids, columns, values } = changes;
      ids.forEach((id, index) => {
        const record: Record<string, ColumnValue> = {};
        const value = values[index];
        columns.forEach((column, colIndex) => {
          record[column] = value[colIndex];
        });
        const uuid = identityToString(id);
        if (collection.has(uuid)) {
          const existingItem = collection.get(uuid)!;
          Object.assign(existingItem.record, record);
        } else {
          collection.set(uuid, { id, record });
        }
      });
    });

    return collection;
  }

  prune(deleteRecords: Identity[] = [], deleteColumns: string[] = []) {
    deleteRecords.forEach((identity) => {
      const id = identityToString(identity);
      this._deleteRecords.set(id, identity);
    });

    deleteColumns.forEach((column) => {
      this._deleteColumns.add(column);
    });
    return this;
  }

  execPrune(deleteRecords: Identity[] = [], deleteColumns: string[] = []) {
    for (const identity of deleteRecords) {
      const id = identityToString(identity);
      const result = this._collection.delete(id);
      if (result) {
        this._deleteRecords.delete(id);
      } else {
        this._deleteRecords.set(id, identity);
      }
    }

    if (this._collection.size === 0) {
      this._deleteColumns = new Set();
      return this;
    }

    const _deleteColumns = new Set<string>(deleteColumns);
    for (const [uuid, { record }] of this._collection.entries()) {
      _deleteColumns.forEach((column) => {
        delete record[column];
        this._deleteColumns.delete(column);
      });

      if (Object.keys(record).length === 0) {
        this._collection.delete(uuid);
      }
    }
    return this;
  }

  getRemainDeleteRecords() {
    return [...this._deleteRecords.values()];
  }

  toRecordChangesArray(): RecordChanges[] {
    const map = new Map<string, { ids: Identity[]; values: ColumnValue[][] }>();

    const keys = this._deleteRecords.keys();
    for (const key of keys) {
      const result = this._collection.delete(key);
      if (result) {
        this._deleteRecords.delete(key);
      }
    }
    if (this._collection.size === 0) return [];

    for (const { id, record } of this._collection.values()) {
      this._deleteColumns.forEach((column) => {
        delete record[column];
      });
      const columns = Object.keys(record).sort();
      if (columns.length === 0) continue;

      const value = columns.map((col) => record[col]);
      const key = columns.join();
      if (map.has(key)) {
        const existingItem = map.get(key)!;
        existingItem.ids.push(id);
        existingItem.values.push(value);
      } else {
        map.set(key, {
          ids: [id],
          values: [value],
        });
      }
    }

    const changesArray: RecordChanges[] = [];
    for (const [key, { ids, values }] of map.entries()) {
      changesArray.push({
        ids,
        columns: key.split(","),
        values,
      });
    }
    return changesArray;
  }

  isEmpty() {
    return this._collection.size === 0;
  }

  static transform(
    curtCollection: RecordChangesCollection,
    recvCollection: RecordChangesCollection
  ) {
    for (const [uuid, { record }] of curtCollection._collection.entries()) {
      const recvItem = recvCollection._collection.get(uuid);
      if (recvItem) {
        for (const column of Object.keys(record)) {
          if (column in recvItem.record) {
            delete record[column];
          }
        }

        if (Object.keys(record).length === 0) {
          curtCollection._collection.delete(uuid);
        }
      }
    }
  }
}
