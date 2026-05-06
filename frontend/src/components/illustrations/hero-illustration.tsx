export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 360" role="img" aria-label="PATHS hiring intelligence illustration">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#7c3aed" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.55" />
        </linearGradient>
        <filter id="blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <rect x="24" y="24" width="472" height="312" rx="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
      <circle cx="150" cy="120" r="90" fill="url(#g1)" opacity="0.35" filter="url(#blur)" />
      <rect x="64" y="86" width="240" height="150" rx="18" fill="rgba(2,6,23,0.55)" stroke="rgba(148,163,184,0.25)" />
      <rect x="92" y="118" width="120" height="10" rx="5" fill="rgba(148,163,184,0.35)" />
      <rect x="92" y="142" width="180" height="10" rx="5" fill="rgba(148,163,184,0.22)" />
      <rect x="92" y="166" width="160" height="10" rx="5" fill="rgba(148,163,184,0.18)" />
      <rect x="92" y="198" width="84" height="22" rx="11" fill="rgba(56,189,248,0.35)" stroke="rgba(56,189,248,0.55)" />
      <rect x="330" y="86" width="126" height="126" rx="22" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.10)" />
      <path
        d="M360 150c18-10 40-10 58 0"
        fill="none"
        stroke="rgba(56,189,248,0.65)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="393" cy="132" r="7" fill="rgba(56,189,248,0.85)" />
      <rect x="352" y="214" width="82" height="10" rx="5" fill="rgba(148,163,184,0.25)" />
    </svg>
  );
}
