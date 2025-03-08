import sqlite3InitModule, { Sqlite3Static } from "@sqlite.org/sqlite-wasm";

const main = (sqlite3: Sqlite3Static) => {
  console.log('version: ', sqlite3.version);
};

sqlite3InitModule({
  print: console.log,
  printErr: console.error,
})
  .then(main)
  .catch((e) => console.error("error", e));
