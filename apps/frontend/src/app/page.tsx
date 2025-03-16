"use client";

import dynamic from "next/dynamic";

// import Editor from "@/sections/editor/editor";
const Editor = dynamic(() => import("@/sections/editor/editor"), { ssr: false });

export default function Home() {
  return (
    <main className="h-screen w-screen flex justify-center items-center">
      <Editor />
    </main>
  );
}
