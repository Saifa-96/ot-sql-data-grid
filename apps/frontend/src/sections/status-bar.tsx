"use client";

import { SQLStore } from "sql-store";
import { useEditorContext } from "./editor-context";
import { useEffect, useState } from "react";
import EditorClient from "./editor-context/editor-client";

const StatusBar = () => {
  const context = useEditorContext();

  return (
    <div className="py-1 px-2 text-sm font-bold">
      {context && <TotalCount {...context} />}
    </div>
  );
};

const TotalCount: React.FC<{ client: EditorClient; store: SQLStore }> = ({
  client,
  store,
}) => {
  const [totalCount, setTotalCount] = useState(() =>
    store.getRecordTotalCount()
  );

  useEffect(() => {
    const update = () => {
      setTotalCount(store.getRecordTotalCount());
    };
    client.subscribeToEvent("apply-server", update);
    client.subscribeToEvent("apply-client", update);
    return () => {
      client.unsubscribeFromEvent("apply-server", update);
      client.unsubscribeFromEvent("apply-client", update);
    };
  }, [client, store]);

  return (
    <>
      <span className="text-gray-500">Total Count: </span>
      {totalCount}
    </>
  );
};

export default StatusBar;
