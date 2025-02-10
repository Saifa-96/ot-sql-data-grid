import { isMatching, match, P } from "ts-pattern";
import * as OT from "./types";
import { isEmpty } from "lodash";

export function isIdentityEqual(id1: OT.Identity, id2: OT.Identity): boolean {
  const hasId = isMatching({ id: P.string });
  return hasId(id1) 
    ? hasId(id2) 
      ? id1.id === id2.id
      : id1.symbol === id2.symbol
    : id1.symbol === id2.symbol;
}

export function isClientSymbol(id: OT.Identity): id is OT.ClientSymbol {
  return isMatching({ symbol: P.string }, id);
}

export function toIdentityWithID(
  clientSymbol: OT.ClientSymbol,
  id: string
): OT.IdentityWithID {
  return { id, ...clientSymbol };
}

export function getIDinIdentity(id: OT.Identity): string | null {
  return match(id)
    .returnType<string | null>()
    .with({ id: P.string }, ({ id }) => id)
    .otherwise(() => null);
}

type Required<T> = {
  [P in keyof T]-?: T[P];
};

export function fillOperation(op: OT.Operation = {}): Required<OT.Operation> {
  return {
    deleteRows: [],
    deleteCols: [],
    insertRows: [],
    insertCols: [],
    updateCells: [],
    ...op,
  };
}

export function strip(o: Required<OT.Operation>) {
  const newOp = { ...o };
  Object.entries(o).forEach(([key, value]) => {
    if (isEmpty(value)) {
      delete newOp[key as keyof OT.Operation];
    }
  });
  return newOp;
}
