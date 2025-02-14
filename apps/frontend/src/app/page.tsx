"use client";
import { Button } from "@/components/ui/button";
import { Provider } from "jotai";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Editor } from "@/sections/editor/editor";
const queryClient = new QueryClient();

export default function Home() {
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <Editor />
        <Button className="mt-1">New Record</Button>
      </QueryClientProvider>
    </Provider>
  );
}
