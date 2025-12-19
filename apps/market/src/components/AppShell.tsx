"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "@/components/CartProvider";
import { AgentProvider, ChatSidebar, DealSidebar } from "@/components/agent";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebars = pathname !== "/";

  return (
    <AgentProvider>
      {showSidebars ? <ChatSidebar /> : null}
      <CartProvider>{children}</CartProvider>
      {showSidebars ? <DealSidebar /> : null}
    </AgentProvider>
  );
}
