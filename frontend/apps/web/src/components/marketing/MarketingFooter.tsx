import Link from "next/link";
import { Zap, Shield, Globe, FileText } from "lucide-react";

const cols = [
  {
    heading: "Product",
    links: [
      { label: "How it Works", href: "/how-it-works" },
      { label: "For Candidates", href: "/for-candidates" },
      { label: "For Companies", href: "/for-companies" },
      { label: "Open Jobs", href: "/careers" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About PATHS", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Get Started",
    links: [
      { label: "Create Profile", href: "/candidate-signup" },
      { label: "Sign In", href: "/login" },
      { label: "Request Demo", href: "#" },
      { label: "API Docs", href: "#" },
    ],
  },
];

const compliance = [
  { icon: Shield, label: "Egypt PDPL" },
  { icon: Globe, label: "EU AI Act" },
  { icon: FileText, label: "EEOC Compliant" },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border/40 bg-navy-950/80">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand column */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-heading text-sm font-bold text-foreground">PATHS</p>
                <p className="text-[10px] text-muted-foreground">AI Hiring OS</p>
              </div>
            </Link>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Evidence-driven, human-in-the-loop hiring that reduces bias and accelerates decisions.
            </p>
            {/* Compliance badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              {compliance.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/20 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.heading}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 sm:flex-row">
          <p className="text-[12px] text-muted-foreground/60">
            © 2026 PATHS AI. All rights reserved.
          </p>
          <p className="text-[12px] text-muted-foreground/40">
            Built to reduce bias. Designed for transparency.
          </p>
        </div>
      </div>
    </footer>
  );
}
