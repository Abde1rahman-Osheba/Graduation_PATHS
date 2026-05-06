import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function Input({ label, hint, className, id, ...props }: InputProps) {
  const fieldId = id ?? label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label className="block space-y-1.5" htmlFor={fieldId}>
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</span>
      <input
        id={fieldId}
        className={cn(
          "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20",
          className,
        )}
        {...props}
      />
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </label>
  );
}
