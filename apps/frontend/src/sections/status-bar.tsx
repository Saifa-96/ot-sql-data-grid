"use client";

import { useEffect, useState } from "react";
import { useEditorContext } from "./use-editor-context";

const StatusBar = () => {
  const { store, client } = useEditorContext();
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
    <div className="py-1 px-2 text-sm font-bold">
      <span className="text-gray-500">Total Count: </span>
      {totalCount}
    </div>
  );
};

export default StatusBar;
