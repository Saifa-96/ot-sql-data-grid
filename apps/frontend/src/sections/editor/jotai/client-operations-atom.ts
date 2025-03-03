import { atom, createStore, useAtomValue } from "jotai";
import { Operation, ClientState } from "operational-transformation";

export interface OperationDetail {
  id: string;
  action: string;
  revision: number;
  operation: Operation;
  state: ClientState;
}

const clientOperationsAtom = atom<OperationDetail[]>([]);

export const useClientOperations = () => {
  return useAtomValue(clientOperationsAtom);
};

// 获取默认的 Jotai store
export const privateJotaiStore = createStore();

let count = 0;
// 在组件外部修改原子状态
export const unshiftOperation = (op: Omit<OperationDetail, "id">) => {
  count++;
  privateJotaiStore.set(clientOperationsAtom, (prev) => [
    { ...op, id: count.toString() },
    ...prev,
  ]);
};
