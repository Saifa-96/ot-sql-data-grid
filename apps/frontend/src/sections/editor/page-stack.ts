import { SqlValue } from "sql.js";

export type Rows = Map<string, SqlValue>[];

export type ReachedState = "top" | "bottom" | "out-of-range" | null;

export interface PageData {
  data: Rows;
  page: number;
}

type PageDataStack = [PageData, PageData, PageData];

export class PageStack {
  private stack: PageDataStack;
  private rows: Rows;
  private range: [number, number];
  private pageSize: number;

  constructor(stack: PageDataStack, pageSize: number) {
    this.stack = stack;
    this.pageSize = pageSize;
    this.range = this.getPageStackRange(stack);
    this.rows = this.getRowsFromStack(stack);
  }

  private getPageStackRange(stack: PageDataStack): [number, number] {
    const { pageSize } = this;
    const headerIndex = (stack[0].page - 1) * pageSize;
    const tailIndex =
      headerIndex +
      stack.reduce((acc, item) => {
        acc += item.data.length;
        return acc;
      }, -1);
    return [headerIndex, tailIndex];
  }

  private getRowsFromStack(stack: PageDataStack): Rows {
    return stack.flatMap((item) => item.data);
  }

  getCurrentPages(): [number, number, number] {
    return this.stack.map((i) => i.page) as [number, number, number];
  }

  getReachedState(start: number, end: number): ReachedState {
    const { range } = this;
    // The current page is out of the range.
    if (range[0] > end || range[1] < start) {
      return "out-of-range";
    }

    // The current page is reached the top of the page stack.
    if (range[0] > start) {
      return "top";
    }

    // The current page is the last page.
    if (range[1] < end) {
      return "bottom";
    }

    return null;
  }

  getRowsData(
    startIndex: number,
    endIndex: number
  ): (Map<string, SqlValue> | null)[] {
    const offset = this.range[0];
    const start = startIndex - offset;
    const end = endIndex - offset;
    return this.rows.slice(start, end + 1);
  }

  prevStep(callback: (page: number) => Rows): PageStack {
    const { stack } = this;
    const [page1, page2, _] = stack;
    const prevPage = page1.page - 1;
    const page0: PageData = { data: callback(prevPage), page: prevPage };
    return new PageStack([page0, page1, page2], this.pageSize);
  }

  nextStep(callback: (page: number) => Rows): PageStack {
    const { stack } = this;
    const [_, page0, page1] = stack;
    const nextPage = page1.page + 1;
    const page2: PageData = { data: callback(nextPage), page: nextPage };
    return new PageStack([page0, page1, page2], this.pageSize);
  }

  getPageRangeByCurrentIndex(curIdx: number): [number, number, number] {
    const { pageSize } = this;
    const page = Math.ceil(curIdx / pageSize);
    const page0 = Math.max(0, page - 1);
    return [page0, page0 + 1, page0 + 2];
  }
}
