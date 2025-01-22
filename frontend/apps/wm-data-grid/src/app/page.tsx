"use client";
import { Editor } from "@/components/section/editor/editor";
import initSQL from "sql.js";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
const queryClient = new QueryClient();

export default function Home() {
  useEffect(() => {
    const runSQL = async () => {
      const SQL = await initSQL({
        // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
        // You can omit locateFile completely when running in node
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      });

      // Create a database
      const db = new SQL.Database();
      // NOTE: You can also use new SQL.Database(data) where
      // data is an Uint8Array representing an SQLite database file

      // Run a query without reading the results
      db.run("CREATE TABLE test (col1, col2);");
      // Insert two rows: (1,111) and (2,222)
      db.run("INSERT INTO test VALUES (?,?), (?,?)", [1, 111, 2, 222]);

      // Prepare a statement
      const stmt = db.prepare(
        "SELECT * FROM test WHERE col1 BETWEEN $start AND $end"
      );
      stmt.getAsObject({ $start: 1, $end: 1 }); // {col1:1, col2:111}

      // Bind new values
      stmt.bind({ $start: 1, $end: 2 });
      while (stmt.step()) {
        //
        const row = stmt.getAsObject();
        console.log("Here is a row: " + JSON.stringify(row));
      }
    };
    runSQL();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Editor />
    </QueryClientProvider>
  );
}
