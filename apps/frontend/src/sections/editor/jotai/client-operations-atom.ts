import { atom, createStore, useAtomValue } from 'jotai';
import { Operation, ClientState } from 'operational-transformation';

export interface OperationDetail {
  action: string;
  revision: number;
  operation: Operation;
  state: ClientState;
}

const clientOperationsAtom = atom<OperationDetail[]>([]);

export const useClientOperations = () => {
  return useAtomValue(clientOperationsAtom);
}

// 获取默认的 Jotai store
export const privateJotaiStore = createStore();

// 在组件外部修改原子状态
export const unshiftOperation = (op: OperationDetail) => {
  privateJotaiStore.set(clientOperationsAtom, (prev) => [op, ...prev]);
};