import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingSiteHeader } from "@/components/layout/marketing-site-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <MarketingSiteHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
