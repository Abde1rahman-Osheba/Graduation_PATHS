import Link from "next/link";
import { GlossCard } from "@/components/ui/gloss-card";

export function UnauthorizedState({ message }: { message: string }) {
  return (
    <GlossCard glow className="text-center">
      <p className="text-sm text-zinc-300">{message}</p>
      <Link href="/login" className="mt-3 inline-block text-sm text-sky-400 hover:underline">
        Go to login
      </Link>
    </GlossCard>
  );
}
