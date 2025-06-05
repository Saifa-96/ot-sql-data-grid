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
    client.emitter.on("applyServer", update);
    client.emitter.on("serverAck", update);
    return () => {
      client.emitter.off("applyServer", update);
      client.emitter.off("serverAck", update);
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
