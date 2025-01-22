import * as d from "./data-grid";
import { Server } from "./server";

export class OperationalTransformation {
  server: Server

  constructor() {
    this.server = new Server();
  }

  getDataByPage(page: number) {
    const store = this.server.store;
    const rows = d.getRowsByPage(store, page);
    return {
      header: store.header,
      rows,
      total: store.data.length,
    };
  }
}
