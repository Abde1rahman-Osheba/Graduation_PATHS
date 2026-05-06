import { GlossCard } from "@/components/ui/gloss-card";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <GlossCard glow>
      <h2 className="text-base font-semibold text-red-300">{title}</h2>
      {message && <p className="mt-2 text-sm text-zinc-400">{message}</p>}
      {onRetry && (
        <Button type="button" variant="ghost" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </GlossCard>
  );
}
