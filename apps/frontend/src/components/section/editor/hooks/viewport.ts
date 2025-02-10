import { SqlValue } from "sql.js";
import { EditorClient } from "./use-socket-io";

export type Rows = Map<string, SqlValue>[];

export type ReachedState = "top" | "bottom" | "out-of-range" | null;

export interface PageData {
  data: Rows;
  page: number;
}

type PageDataStack = [PageData, PageData, PageData];

export interface PageStack {
  stack: [PageData, PageData, PageData];
  pageSize: number;
}

export class PageStackManager {
  private client: EditorClient;
  private stack: PageDataStack;
  private rows: Rows;
  private range: [number, number];
  private pageSize: number;

  constructor(client: EditorClient, pageSize: number) {
    this.client = client;
    this.pageSize = pageSize;
    this.stack = [this.pageData(1), this.pageData(2), this.pageData(3)];
    this.range = this.getPageStackRange();
    this.rows = this.getRowsFromStack();
  }

  private pageData(page: number): PageData {
    const data = this.client.getRowsByPage(page, this.pageSize);
    return { data, page };
  }

  private getPageStackRange(): [number, number] {
    const { pageSize, stack } = this;
    const headerIndex = (stack[0].page - 1) * pageSize;
    const tailIndex =
      headerIndex +
      stack.reduce((acc, item) => {
        acc += item.data.length;
        return acc;
      }, -1);
    return [headerIndex, tailIndex];
  }

  private getRowsFromStack(): Rows {
    return this.stack.flatMap((item) => item.data);
  }

  getRowDataByIndex(curIdx: number): Map<string, SqlValue> {
    const { range } = this;
    const index = curIdx - range[0];
    return this.rows[index];
  }

  calcReachedState(start: number, end: number): ReachedState {
    const { pageSize, stack, range } = this;
    const page0 = stack[0];
    const page2 = stack[2];

    // The current page is out of the range.
    if (range[0] > end || range[1] < start) {
      return "out-of-range";
    }

    // The current page is the first page and the data is less than a page.
    if (end < pageSize && start === 0) {
      return null;
    }

    // The current page is the last page.
    if (range[1] < end && page2.data.length !== 0) {
      return "bottom";
    }

    // The current page is reached the top of the page stack.
    if (range[0] > start && page0.page !== 1) {
      return "top";
    }

    return null;
  }

  prevStep() {
    const { stack } = this;
    const [page0, page1, _] = stack;
    this.stack = [this.pageData(page0.page - 1), page0, page1];
    this.range = this.getPageStackRange();
    this.rows = this.getRowsFromStack();
  }

  nextStep() {
    const { stack } = this;
    const [_, page1, page2] = stack;
    this.stack = [page1, page2, this.pageData(page2.page + 1)];
    this.range = this.getPageStackRange();
    this.rows = this.getRowsFromStack();
  }

  refetchStackData(start?: number) {
    const { pageSize, range } = this;
    const page = Math.floor(start ?? range[0] / pageSize);
    this.stack = [
      this.pageData(page),
      this.pageData(page + 1),
      this.pageData(page + 2),
    ];
    this.range = this.getPageStackRange();
    this.rows = this.getRowsFromStack();
  }
}
