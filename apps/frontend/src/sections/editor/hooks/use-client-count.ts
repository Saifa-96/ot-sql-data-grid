import { useEffect, useState } from "react";
import { EditorState } from "./use-editor-state";

export const useClientCount = (state: EditorState) => {
    const [clientCount, setClientCount] = useState(0);

    useEffect(() => {
        const updateClientCount = (count: number) => {
            setClientCount(count);
        };

        state.socketMgr.listenEvents({ connectionCount: updateClientCount });
        state.socketMgr.getClientCount();
        return () => {
            state.socketMgr.offListenEvents({ connectionCount: updateClientCount });
        }

    }, [state]);

    return clientCount;
}
