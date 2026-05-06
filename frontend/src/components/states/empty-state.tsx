import { GlossCard } from "@/components/ui/gloss-card";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <GlossCard>
      <h2 className="text-base font-semibold text-zinc-200">{title}</h2>
      {description && <p className="mt-2 text-sm text-zinc-500">{description}</p>}
    </GlossCard>
  );
}
