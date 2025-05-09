import { curry } from "ramda";
import { SQLStore } from "sql-store";
import { SqlValue } from "sql.js";

export interface PageData {
  data: Record<string, SqlValue>[];
  page: number;
}

type PageDataStack = [PageData, PageData, PageData];

class PageStack {
  readonly dataStack: PageDataStack;
  readonly range: [number, number];
  readonly pageSize: number;

  constructor(stack: PageDataStack, pageSize: number) {
    this.dataStack = stack;
    this.range = this.pageStackRange(stack, pageSize);
    this.pageSize = pageSize;
  }

  getRowsData(
    startIndex: number,
    endIndex: number
  ): Record<string, SqlValue>[] {
    const rows = this.dataStack.flatMap((page) => page.data);
    const offset = this.range[0];
    const start = startIndex - offset;
    const end = endIndex - offset;
    return rows.slice(start, end + 1);
  }

  private pageStackRange(
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
}
export default PageStack;

export const updatePageStack = curry(
  (
    params: {
      start: number;
      end: number;
      store: SQLStore;
    },
    pageStack: PageStack
  ): PageStack => {
    const { start, end, store } = params;
    const { range, pageSize } = pageStack;

    // The current page is out of the range.
    if (range[0] > end || range[1] < start) {
      return refetchPageStack(start, store, pageSize);
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

const prevStep = (pageStack: PageStack, store: SQLStore): PageStack => {
  const { dataStack, pageSize } = pageStack;
  const [page1, page2, _] = dataStack;
  const prevPage = page1.page - 1;
  const data = store.getRecordsByPage(prevPage, pageSize);
  const page0: PageData = { data, page: prevPage };

  return new PageStack([page0, page1, page2], pageSize);
};

const nextStep = (pageStack: PageStack, store: SQLStore): PageStack => {
  const { dataStack, pageSize } = pageStack;
  const [_, page0, page1] = dataStack;
  const nextPage = page1.page + 1;
  const data = store.getRecordsByPage(nextPage, pageSize);
  const page2: PageData = { data, page: nextPage };

  return new PageStack([page0, page1, page2], pageSize);
};

const refetchPageStack = (
  currentRowIndex: number,
  store: SQLStore,
  pageSize: number
): PageStack => {
  const page = Math.ceil(currentRowIndex / pageSize);
  const page0 = Math.max(0, page - 1);
  const page1 = page0 + 1;
  const page2 = page0 + 2;
  const stack: PageDataStack = [
    {
      data: store.getRecordsByPage(page0, pageSize),
      page: page0,
    },
    {
      data: store.getRecordsByPage(page1, pageSize),
      page: page1,
    },
    {
      data: store.getRecordsByPage(page2, pageSize),
      page: page2,
    },
  ];
  return new PageStack(stack, pageSize);
};

export const refreshPageStack = curry(
  (dbStore: SQLStore, pageStack: PageStack): PageStack => {
    const pages = pageStack.dataStack.map((i) => i.page);
    const pageSize = pageStack.pageSize;
    return new PageStack(
      [
        {
          data: dbStore.getRecordsByPage(pages[0], pageSize),
          page: pages[0],
        },
        {
          data: dbStore.getRecordsByPage(pages[1], pageSize),
          page: pages[1],
        },
        {
          data: dbStore.getRecordsByPage(pages[2], pageSize),
          page: pages[2],
        },
      ],
      pageSize
    );
  }
);

export const initialPageStack = (dbStore: SQLStore): PageStack => {
  const startPage = 1;
  const rows = dbStore.getRecordsByPage(startPage, 90);
  return new PageStack(
    [
      { data: rows.slice(0, 30), page: startPage },
      { data: rows.slice(30, 60), page: startPage + 1 },
      { data: rows.slice(60, 90), page: startPage + 2 },
    ],
    30
  );
};
