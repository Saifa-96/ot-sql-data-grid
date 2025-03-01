import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EditorState } from "./use-editor-state";
import PageStack, {
  initialPageStack,
  refreshPageStack,
  updatePageStack,
} from "../state/page-stack";

export const useEditorRenderData = (editorState: EditorState) => {
  const [header, setHeader] = useState(() => editorState.dbStore.getHeader());
  const [pageStack, setPageStack] = useState<PageStack>(() =>
    initialPageStack(editorState.dbStore)
  );
  const [totalCount, setTotalCount] = useState(() =>
    editorState.dbStore.getTotalCount()
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    overscan: 4,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const rowsData = useMemo(() => {
    if (virtualRows.length === 0) return [];
    const startIndex = virtualRows[0].index;
    const endIndex = virtualRows[virtualRows.length - 1].index;
    return pageStack.getRowsData(startIndex, endIndex).map((data, index) => ({
      virtualItem: virtualRows[index],
      data,
    }));
  }, [pageStack, virtualRows]);

  const resetCurrentPageStack = useCallback(() => {
    setTotalCount(editorState.dbStore.getTotalCount());
    setPageStack(refreshPageStack(editorState.dbStore));
  }, [editorState.dbStore]);

  const resetCurrentHeader = useCallback(() => {
    setHeader(editorState.dbStore.getHeader());
  }, [editorState.dbStore]);

  useEffect(() => {
    const update = () => {
      console.log("apply server or server ack");
      setHeader(editorState.dbStore.getHeader());
      resetCurrentPageStack();
    };

    editorState.socketMgr.listenEvents({
      applyServer: update,
      serverAck: update,
    });

    return () => {
      editorState.socketMgr.offListenEvents({
        applyServer: update,
        serverAck: update,
      });
    };
  }, [editorState, resetCurrentPageStack]);

  useEffect(() => {
    if (virtualRows.length === 0) return;
    const start = virtualRows[0].index;
    const end = virtualRows[virtualRows.length - 1].index;
    const id = setTimeout(
      () =>
        setPageStack(
          updatePageStack({ start, end, store: editorState.dbStore })
        ),
      100
    );
    return () => clearTimeout(id);
  }, [editorState.dbStore, virtualRows]);

  return {
    virtualizer,
    header,
    rowsData,
    containerRef,
    resetCurrentPageStack,
    resetCurrentHeader,
  };
};
