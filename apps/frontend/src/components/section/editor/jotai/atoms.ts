"use client";

import { atom, useAtom } from "jotai";
import { loadable } from "jotai/utils";
import { EditorClient } from "./editor-client";
import { useCallback, useEffect } from "react";

const asyncAtom = atom<null | Promise<EditorClient>>(null);
const loadableAtom = loadable(asyncAtom);

export const useEditorClient = () => {
  const [client] = useAtom(loadableAtom);
  const [_, setClient] = useAtom(asyncAtom);

  useEffect(() => {
    setClient(EditorClient.new("http://localhost:3009"));
  }, [setClient]);

  const resetClient = useCallback(() => {
  }, [setClient]);

  return {
    client,
    resetClient,
  };
};
