"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Props = React.PropsWithChildren<{
  className?: string;
  glow?: boolean;
}>;

export function GlossCard({ children, className, glow }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl",
        glow &&
          "before:pointer-events-none before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-br before:from-sky-500/20 before:via-violet-500/10 before:to-transparent before:p-px",
        className,
      )}
    >
      {glow && (
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-sky-500/15 blur-3xl"
          aria-hidden
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
