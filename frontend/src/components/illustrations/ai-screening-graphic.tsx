export function AIScreeningGraphic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 320" role="img" aria-label="AI-assisted screening illustration">
      <defs>
        <linearGradient id="ai" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="28" y="28" width="464" height="264" rx="26" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
      <rect x="64" y="70" width="170" height="170" rx="22" fill="rgba(2,6,23,0.55)" stroke="rgba(148,163,184,0.22)" />
      <path d="M96 118h106M96 142h92M96 166h120" stroke="rgba(148,163,184,0.28)" strokeWidth="10" strokeLinecap="round" />
      <circle cx="149" cy="214" r="18" fill="url(#ai)" opacity="0.85" />
      <rect x="270" y="70" width="210" height="64" rx="18" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.35)" />
      <rect x="292" y="92" width="120" height="12" rx="6" fill="rgba(226,232,240,0.35)" />
      <rect x="270" y="150" width="210" height="90" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
      <path d="M292 190h170" stroke="rgba(148,163,184,0.25)" strokeWidth="10" strokeLinecap="round" />
      <path d="M292 214h130" stroke="rgba(148,163,184,0.18)" strokeWidth="10" strokeLinecap="round" />
      <rect x="292" y="232" width="86" height="22" rx="11" fill="rgba(34,197,94,0.18)" stroke="rgba(34,197,94,0.35)" />
    </svg>
  );
}
