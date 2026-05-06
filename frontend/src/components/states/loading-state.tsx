import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
      <Loader2 className="h-7 w-7 animate-spin text-sky-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
