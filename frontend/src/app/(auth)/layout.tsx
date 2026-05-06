import Link from "next/link";
import { Container } from "@/components/layout/container";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="border-b border-white/[0.06] bg-zinc-950/70 backdrop-blur-xl">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-100">
            PATHS<span className="text-zinc-500">.ai</span>
          </Link>
          <Link href="/product" className="text-xs text-zinc-500 hover:text-zinc-200">
            Product
          </Link>
        </Container>
      </div>
      <Container className="py-10">{children}</Container>
    </div>
  );
}
