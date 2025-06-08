"use client";
import { createStore, Provider } from "jotai";

export const store = createStore();
export const JotaiProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return <Provider>{children}</Provider>;
};
