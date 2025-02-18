import { isMatching, P } from "ts-pattern";

export interface UUID {
  uuid: string;
  symbol?: string;
}

export interface ClientSymbol {
  symbol: string;
}

export type Identity = UUID | ClientSymbol;

export function isIdentityEqual(id1: Identity, id2: Identity): boolean {
  return isMatching({ uuid: P.string }, id1)
    ? isMatching({ uuid: P.string }, id2)
      ? id1.uuid === id2.uuid
      : id1.symbol === id2.symbol
    : id1.symbol === id2.symbol;
}

export function getUUIDinIdentity(id: Identity): string | null {
  return isMatching({ uuid: P.string }, id) ? id.uuid : null;
}

export function identityToString(id: Identity): string {
  return isMatching({ uuid: P.string }, id) ? id.uuid : id.symbol;
}

export function isClientSymbol(id: Identity): id is ClientSymbol {
  return isMatching({ symbol: P.string, uuid: P.nullish.optional() }, id);
}

export function getBothUUIDandClientSymbol(
  id: Identity
): { uuid: string; symbol: string } | null {
  return isMatching({ uuid: P.string, symbol: P.string }, id) ? id : null;
}
