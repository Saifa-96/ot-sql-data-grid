// TODO: update error message.
import io from "@/utils/io";
import {
  ColumnChanges,
  Operation,
  RecordChanges,
} from "operational-transformation";
import { QueryExecResult } from "sql.js";
import { v4 as uuid } from "uuid";

export const updateOperation = io.from<QueryExecResult, Operation>(
  (queryResult) => {
    const { columns, values } = queryResult;
    if (!columns.includes("id")) {
      return io.err(`"update" statement result must have "id" column`);
    }

    const idIndex = columns.indexOf("id");
    const newColumns = columns.filter((column) => column !== "id");
    const changes = values.reduce<RecordChanges>(
      (c, row) => {
        const rowValues = [...row];
        rowValues.splice(idIndex, 1);
        const values = rowValues.map((value) => value?.toString() ?? "");
        const id = row[idIndex]?.toString() ?? "";
        c.ids.push({ uuid: id });
        c.values.push(values);
        return c;
      },
      {
        ids: [],
        columns: newColumns,
        values: [],
      }
    );

    return io.ok({
      updateRecords: [changes],
    });
  }
);

export const deleteRowsOperation = io.from<QueryExecResult, Operation>(
  (queryResult) => {
    const { columns, values } = queryResult;
    if (!columns.includes("id")) {
      return io.err(`"delete" statement result must have "id" column`);
    }
    const keyIndex = columns.indexOf("id");
    return io.ok({
      deleteRecords: values.map((row) => ({
        uuid: row[keyIndex]?.toString() ?? "",
      })),
    });
  }
);

export const deleteColsOperation = io.from<QueryExecResult, Operation>(
  (queryResult) => {
    const { columns, values } = queryResult;
    if (!columns.includes("field_name")) {
      return io.err(
        `Delete record from 'columns' table, must have "field_name" column`
      );
    }
    const keyIndex = columns.indexOf("field_name");
    return io.ok({
      deleteColumns: values.map((row) => row[keyIndex]?.toString() ?? ""),
    });
  }
);

export const insertColsOperation = io.from<QueryExecResult, Operation>(
  (queryResult) => {
    const { columns, values } = queryResult;
    if (!columns.includes("field_name")) {
      return io.err(
        `Insert record into 'columns' table, must have "field_name" column`
      );
    }
    if (!columns.includes("display_name")) {
      return io.err(
        `Insert record into 'columns' table, must have "display_name" column`
      );
    }
    if (!columns.includes("width")) {
      return io.err(
        `Insert record into 'columns' table, must have "width" column`
      );
    }
    if (!columns.includes("order_by")) {
      return io.err(
        `Insert record into 'columns' table, must have "order_by" column`
      );
    }

    const indexRecord = columns.reduce<Record<string, number>>(
      (acc, column, index) => {
        acc[column] = index;
        return acc;
      },
      {}
    );

    const op: Operation = {
      insertColumns: values.reduce<Record<string, ColumnChanges>>(
        (record, row) => {
          const fieldName = row[indexRecord["field_name"]] as string;
          const displayName = row[indexRecord["display_name"]] as string;
          const width = row[indexRecord["width"]] as number;
          const orderBy = row[indexRecord["order_by"]] as number;

          record[fieldName] = {
            name: fieldName,
            displayName,
            width,
            orderBy,
          };

          return record;
        },
        {}
      ),
    };

    return io.ok(op);
  }
);

export const insertRowsOperation = io.from<QueryExecResult, Operation>(
  (queryResult) => {
    const { columns, values } = queryResult;
    if (columns.includes("id")) {
      return io.err(`"insert" statement result must not have "id" column`);
    }

    const changes = values.reduce<RecordChanges>(
      (changes, row) => {
        const rowValues = row.map((value) => value?.toString() ?? "");
        changes.ids.push({ symbol: uuid() });
        changes.values.push(rowValues);
        return changes;
      },
      {
        ids: [],
        columns: columns.filter((column) => column !== "id"),
        values: [],
      }
    );

    return io.ok({
      insertRecords: [changes],
    });
  }
);
