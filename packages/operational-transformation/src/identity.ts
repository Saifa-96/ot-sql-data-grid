import { isMatching, P } from "ts-pattern";

export interface IdentityWithID {
  id: string;
  symbol?: string;
}

export interface ClientSymbol {
  symbol: string;
}

export type Identity = IdentityWithID | ClientSymbol;

export function isIdentityEqual(id1: Identity, id2: Identity): boolean {
  return isMatching({ id: P.string }, id1)
    ? isMatching({ id: P.string }, id2)
      ? id1.id === id2.id
      : id1.symbol === id2.symbol
    : id1.symbol === id2.symbol;
}

export function isClientSymbol(id: Identity): id is ClientSymbol {
  return isMatching({ symbol: P.string }, id);
}

export function toIdentityWithID(
  clientSymbol: ClientSymbol,
  id: string
): IdentityWithID {
  return { id, ...clientSymbol };
}

export function getIDinIdentity(id: Identity): string | null {
  return isMatching({ id: P.string }, id) ? id.id : null;
}
