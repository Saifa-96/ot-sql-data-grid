import { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic"; // 禁用路由缓存

const requestBody = z.object({
  text: z.string(),
  dbInfo: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { success, data } = requestBody.safeParse(body);
  if (!success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: body.error.format(),
      }),
      { status: 400 }
    );
  }

  const response = await send(chatMessages(data.text, data.dbInfo));

  if (!response.ok) {
    console.error("Error:", await response.text());
    return new Response(
      JSON.stringify({
        error: "Failed to fetch data from the API",
      }),
      { status: response.status }
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

const send = async (messages: unknown) => {
  const tools = [
    {
      type: "function",
      function: {
        name: "get_columns_information",
        description: [
          "Get the column information of a table",
          "@returns {ColumnItem[]} Returns an array of column metadata, each item contains:",
          "- fieldName: Column name in the database",
          "- displayName: Column name to be displayed in the UI",
          "- width: Column width in pixels",
          "- orderBy: Column name for sorting",
          "- type?: Column type, if not provided, default to 'TEXT'",
        ].join("\n"),
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
  ];

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
      tools,
    }),
  });
};

const chatMessages = (
  text: string,
  _dbInfo: Record<string, unknown>
): Record<string, unknown>[] => {
  return [
    // {
    //   role: "system",
    //   content: JSON.stringify(dbInfo),
    // },
    {
      role: "user",
      content: text,
    },
  ];
};
