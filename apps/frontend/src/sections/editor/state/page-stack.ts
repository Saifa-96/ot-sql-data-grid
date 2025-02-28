import { SqlValue } from "sql.js";
import Store from "./store";
import { curry } from "ramda";

export type Rows = Map<string, SqlValue>[];

export interface PageData {
  data: Rows;
  page: number;
}

type PageDataStack = [PageData, PageData, PageData];

interface IPageStack {
  readonly dataStack: PageDataStack;
  readonly range: [number, number];
  readonly pageSize: number;
}

export const updatePageStack = curry(
  (
    params: {
      start: number;
      end: number;
      store: Store;
    },
    pageStack: IPageStack
  ): IPageStack => {
    const { start, end, store } = params;
    const { range, pageSize } = pageStack;

    // The current page is out of the range.
    if (range[0] > end || range[1] < start) {
      return refreshPageStack(start, store, pageSize);
    }

    // The current page is reached the top of the page stack.
    if (range[0] > start) {
      return prevStep(pageStack, store);
    }

    // The current page is the last page.
    if (range[1] < end) {
      return nextStep(pageStack, store);
    }

    // The current page still in the range.
    return pageStack;
  }
);

const prevStep = (pageStack: IPageStack, store: Store): IPageStack => {
  const { dataStack, pageSize } = pageStack;
  const [page1, page2, _] = dataStack;
  const prevPage = page1.page - 1;
  const data = store.getRowsByPage(prevPage, pageSize);
  const page0: PageData = { data, page: prevPage };

  return {
    dataStack: [page0, page1, page2],
    range: pageStackRange([page0, page1, page2], pageSize),
    pageSize,
  };
};

const nextStep = (pageStack: IPageStack, store: Store): IPageStack => {
  const { dataStack, pageSize } = pageStack;
  const [_, page0, page1] = dataStack;
  const nextPage = page1.page + 1;
  const data = store.getRowsByPage(nextPage, pageSize);
  const page2: PageData = { data, page: nextPage };

  return {
    dataStack: [page0, page1, page2],
    range: pageStackRange([page0, page1, page2], pageSize),
    pageSize,
  };
};

const refreshPageStack = (
  currentRowIndex: number,
  store: Store,
  pageSize: number
): IPageStack => {
  const page = Math.ceil(currentRowIndex / pageSize);
  const page0 = Math.max(0, page - 1);
  const page1 = page0 + 1;
  const page2 = page0 + 2;

  const stack: PageDataStack = [
      {
        data: store.getRowsByPage(page0, pageSize),
        page: page0,
      },
      {
        data: store.getRowsByPage(page1, pageSize),
        page: page1,
      },
      {
        data: store.getRowsByPage(page2, pageSize),
        page: page2,
      },
    ]
  return {
    pageSize,
    range: pageStackRange(stack, pageSize),
    dataStack: stack,
  };
};

export class PageStack {
  private stack: PageDataStack;
  private rows: Rows;
  private range: [number, number];
  private pageSize: number;

  constructor(stack: PageDataStack, pageSize: number) {
    this.stack = stack;
    this.pageSize = pageSize;
    this.range = pageStackRange(stack, pageSize);
    this.rows = stack.flatMap((item) => item.data);
  }

  getCurrentPages(): [number, number, number] {
    return this.stack.map((i) => i.page) as [number, number, number];
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

  update(start: number, end: number, store: Store): PageStack {
    const { range } = this;
    // The current page is out of the range.
    if (range[0] > end || range[1] < start) {
      return this.generatePageStack(start, store);
    }

    // The current page is reached the top of the page stack.
    if (range[0] > start) {
      return this.prevStep(store);
    }

    // The current page is the last page.
    if (range[1] < end) {
      return this.nextStep(store);
    }

    // The current page still in the range.
    return this;
  }

  private prevStep(store: Store): PageStack {
    const { stack, pageSize } = this;
    const [page1, page2, _] = stack;
    const prevPage = page1.page - 1;
    const data = store.getRowsByPage(prevPage, pageSize);
    const page0: PageData = { data, page: prevPage };
    return new PageStack([page0, page1, page2], pageSize);
  }

  private nextStep(store: Store): PageStack {
    const { stack, pageSize } = this;
    const [_, page0, page1] = stack;
    const nextPage = page1.page + 1;
    const data = store.getRowsByPage(nextPage, pageSize);
    const page2: PageData = { data, page: nextPage };
    return new PageStack([page0, page1, page2], pageSize);
  }

  private generatePageStack(curIdx: number, store: Store): PageStack {
    const { pageSize } = this;
    const page = Math.ceil(curIdx / pageSize);
    const page0 = Math.max(0, page - 1);
    const page1 = page0 + 1;
    const page2 = page0 + 2;
    return new PageStack(
      [
        {
          data: store.getRowsByPage(page0, pageSize),
          page: page0,
        },
        {
          data: store.getRowsByPage(page1, pageSize),
          page: page1,
        },
        {
          data: store.getRowsByPage(page2, pageSize),
          page: page2,
        },
      ],
      30
    );
  }
}

function pageStackRange(
  stack: PageDataStack,
  pageSize: number
): [number, number] {
  const headerIndex = (stack[0].page - 1) * pageSize;
  const tailIndex =
    headerIndex +
    stack.reduce((acc, item) => {
      acc += item.data.length;
      return acc;
    }, -1);
  return [headerIndex, tailIndex];
}
