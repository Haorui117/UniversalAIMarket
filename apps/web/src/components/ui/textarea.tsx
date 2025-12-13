"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-[80px] w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 shadow-[0_0_0_1px_rgba(0,0,0,0.25)] outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/25",
        className
      )}
      {...props}
    />
  );
}
