import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { AgentProvider, AgentSidebar } from "@/components/agent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Universal AI Market",
  description: "Cross-chain AI-powered marketplace with ZetaChain",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="bg-cosmic" />
        <AgentProvider>
          <CartProvider>{children}</CartProvider>
          <AgentSidebar />
        </AgentProvider>
      </body>
    </html>
  );
}

