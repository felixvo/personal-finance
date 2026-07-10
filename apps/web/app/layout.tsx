import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TRPCProvider } from "@/trpc/Provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas",
  description: "A personal financial operating system — your family's financial mirror.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
