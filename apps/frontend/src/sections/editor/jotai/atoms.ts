"use client";

import { atom, useAtom } from "jotai";
import { loadable } from "jotai/utils";
import { EditorClient } from "./editor-client";
import { useEffect, useRef } from "react";

const asyncAtom = atom<null | Promise<EditorClient>>(null);
const loadableAtom = loadable(asyncAtom);

export const useEditorClient = () => {
  const [client] = useAtom(loadableAtom);
  const [_, setClient] = useAtom(asyncAtom);

  const exceed = useRef(false);
  useEffect(() => {
    if (!exceed.current) {
      exceed.current = true;
      setClient(EditorClient.new(process.env.NEXT_PUBLIC_WS_HOST));
    }
  }, [setClient]);

  return {
    client,
  };
};
