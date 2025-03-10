import sqlite3InitModule, { Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { match } from "ts-pattern";
import { eventPayloadSchema } from "./payload-schema";
import { DB_NAME } from "./constants";
import * as events from "./events";

const main = (sqlite3: Sqlite3Static) => {
  if ("opfs" in sqlite3) {
    console.log("OPFS is available, created persisted database at", DB_NAME);
  } else {
    console.log("OPFS is not available, created transient database", DB_NAME);
  }

  console.log("version: ", sqlite3.version);
  // const db = sqlite3.oo1.OpfsDb.importDb(`file:${DB_NAME}?vfs=opfs`, )
  const db = new sqlite3.oo1.OpfsDb(`file:${DB_NAME}?vfs=opfs`, "c");

  self.onmessage = (event) => {
    const { error, data } = eventPayloadSchema.safeParse(event.data);
    if (error) {
      self.postMessage({
        type: "init",
        error: new Error("Invalid event payload: " + error.message),
      });
      return;
    }

    match(data)
      .with({ type: "initialize" }, (data) => events.initializeDB(db, data))
      .with({ type: "get-header" }, () => {
        console.log("get-header");
      })
      .with({ type: "query-rows" }, () => {
        console.log("query-rows");
      })
      .exhaustive();
  };
};

sqlite3InitModule({
  print: console.log,
  printErr: console.error,
})
  .then(main)
  .catch((e) => console.error("error", e));
