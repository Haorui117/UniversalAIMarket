"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white placeholder:text-white/40 shadow-[0_0_0_1px_rgba(0,0,0,0.25)] outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/25",
        className
      )}
      {...props}
    />
  );
}
