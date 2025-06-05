"use client";
import { atom, useAtom, useSetAtom } from "jotai";
import { ScopeProvider } from "jotai-scope";
import { Operation } from "operational-transformation";

type Mode = { type: "edit" } | { type: "diff"; operation: Operation };

const editorStateAtom = atom<{ mode: Mode }>({
  mode: { type: "edit" },
});

export const EditorStateProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return <ScopeProvider atoms={[editorStateAtom]}>{children}</ScopeProvider>;
};

export const useEditorState = () => useAtom(editorStateAtom);
export const useSetEditorState = () => useSetAtom(editorStateAtom);
