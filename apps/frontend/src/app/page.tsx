"use client";
import { Editor } from "@/components/section/editor/editor";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <Editor />
    </QueryClientProvider>
  );
}
