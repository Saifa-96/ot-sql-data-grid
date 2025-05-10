import { NextRequest } from "next/server";
import { systemPrompt } from "./system-prompt";
import { z } from "zod";

export const dynamic = "force-dynamic"; // 禁用路由缓存

const ARK_API_KEY = "1e2dfce3-6cbd-4110-be06-4cce3bf185a5";
const URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

const requestBody = z.object({
  text: z.string(),
  dbInfo: z.object({
    dataTableName: z.string(),
    columnTableName: z.string(),
  }),
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

  const response = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ARK_API_KEY}`,
    },
    body: generateRequestBody(data.text, data.dbInfo),
  });

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

const generateRequestBody = (
  text: string,
  dbInfo: {
    dataTableName: string;
    columnTableName: string;
  }
) => {
  return JSON.stringify({
    model: "deepseek-v3-250324",
    stream: true,
    messages: [
      {
        role: "system",
        content: systemPrompt(dbInfo),
      },
      {
        role: "user",
        content: text,
      },
    ],
  });
};
