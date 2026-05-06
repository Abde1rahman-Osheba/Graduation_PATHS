"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const navLinks = [
  { label: "How it Works", href: "/how-it-works" },
  { label: "For Candidates", href: "/for-candidates" },
  { label: "For Companies", href: "/for-companies" },
  { label: "Jobs", href: "/careers" },
];

export default function MarketingNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/50 bg-background/90 backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Zap className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="leading-none">
            <p className="font-heading text-[15px] font-bold tracking-tight text-foreground">PATHS</p>
            <p className="text-[10px] text-muted-foreground">AI Hiring OS</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                pathname === link.href
                  ? "text-foreground bg-primary/8"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-[13px] text-muted-foreground hover:text-foreground" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-[13px] glow-blue" asChild>
            <Link href="/candidate-signup">Get Started <ChevronRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border/40 bg-background/95 backdrop-blur-md"
          >
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-border/40 pt-3">
                <Button variant="ghost" className="justify-start text-muted-foreground" asChild>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </Button>
                <Button className="gap-1.5 glow-blue" asChild>
                  <Link href="/candidate-signup" onClick={() => setMobileOpen(false)}>
                    Get Started <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
