export interface IdentityWithID {
  id: string;
  symbol?: string;
}
export interface ClientSymbol {
  symbol: string;
}
export type Identity = IdentityWithID | ClientSymbol;

export interface UpdateCell<ID extends Identity = Identity> {
  colId: ID;
  rowId: ID;
  value: string;
}

export interface Operation {
  updateCells?: UpdateCell[];
  deleteRows?: Identity[];
  insertRows?: InsertRow[];
  deleteCols?: Identity[];
  insertCols?: InsertCol[];
}

export interface InsertRow<ID extends Identity = Identity> {
  id: ID;
  data: {
    colId: ID;
    value: unknown;
  }[];
}

export interface InsertCol<ID extends Identity = Identity> {
  id: ID;
  index: number;
  colName: string;
  type: string;
}
