import ReactQueryClientProvider from "@/provider/react-query-provider";
import { JotaiProvider } from "@/provider/Jotai-provider";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "OT-SQL-DATA-GRID",
  description: "A SQL data grid with operational transformation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <JotaiProvider>
      <ReactQueryClientProvider>
        <html lang="en">
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            {children}
            <Toaster />
          </body>
        </html>
      </ReactQueryClientProvider>
    </JotaiProvider>
  );
}
