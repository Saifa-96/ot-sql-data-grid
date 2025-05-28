import { NextRequest } from "next/server";

export const dynamic = "force-dynamic"; // 禁用路由缓存

export async function POST(request: NextRequest) {
  const body = await request.json();
  const response = await send(body);

  if (!response.ok) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch data from the API",
      }),
      {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const iterator = toIterator(response);
  const stream = iteratorToStream(iterator);

  // 返回流式响应给浏览器
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function* toIterator(response: Response) {
  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield new TextDecoder().decode(value);
  }
}

const iteratorToStream = (iterator: AsyncIterator<string>) => {
  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
};

const send = async (messages: unknown[]) => {
  return fetch(process.env.ARK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      stream: true,
      messages,
      // tools,
    }),
  });
};

// const tools = [
//   {
//     type: "function",
//     function: {
//       name: "get_`main_data`_table_information",
//       description: [
//         "Get the column information of the `main_data` table;",
//         "@returns {ColumnItem[]} Returns an array of column metadata, each item contains:",
//         "- fieldName: Column name in the database",
//         "- displayName: Column name to be displayed in the UI",
//         "- width: Column width in pixels",
//         "- orderBy: Column name for sorting",
//         "- type?: Column type, if not provided, default to 'TEXT'",
//       ].join("\n"),
//       parameters: {
//         type: "object",
//         properties: {},
//       },
//     },
//   },
// ];
