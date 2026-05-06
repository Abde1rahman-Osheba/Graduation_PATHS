"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

const variants = {
  primary:
    "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/35",
  ghost: "bg-white/5 text-zinc-100 border border-white/10 hover:bg-white/10",
  danger: "bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25",
} as const;

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: keyof typeof variants;
};

export function Button({ className, variant = "primary", children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
