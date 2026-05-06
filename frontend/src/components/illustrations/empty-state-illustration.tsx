export function EmptyStateIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 260" role="img" aria-label="Empty state illustration">
      <rect x="34" y="34" width="352" height="192" rx="26" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
      <rect x="86" y="92" width="248" height="14" rx="7" fill="rgba(148,163,184,0.22)" />
      <rect x="86" y="122" width="200" height="14" rx="7" fill="rgba(148,163,184,0.16)" />
      <rect x="86" y="152" width="160" height="14" rx="7" fill="rgba(148,163,184,0.12)" />
      <circle cx="210" cy="198" r="22" fill="rgba(56,189,248,0.18)" stroke="rgba(56,189,248,0.35)" />
      <path d="M198 198h24" stroke="rgba(226,232,240,0.75)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
