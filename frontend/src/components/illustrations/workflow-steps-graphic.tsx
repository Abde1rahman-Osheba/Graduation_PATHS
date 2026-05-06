export function WorkflowStepsGraphic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 220" role="img" aria-label="Recruiting workflow steps illustration">
      <rect x="24" y="54" width="592" height="112" rx="26" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
      <circle cx="92" cy="110" r="18" fill="rgba(56,189,248,0.35)" stroke="rgba(56,189,248,0.55)" />
      <circle cx="232" cy="110" r="18" fill="rgba(168,85,247,0.28)" stroke="rgba(168,85,247,0.55)" />
      <circle cx="372" cy="110" r="18" fill="rgba(34,197,94,0.22)" stroke="rgba(34,197,94,0.45)" />
      <circle cx="512" cy="110" r="18" fill="rgba(244,63,94,0.18)" stroke="rgba(244,63,94,0.45)" />
      <path
        d="M110 110h94M250 110h94M390 110h94"
        stroke="rgba(148,163,184,0.35)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="58" y="146" width="120" height="10" rx="5" fill="rgba(148,163,184,0.22)" />
      <rect x="198" y="146" width="120" height="10" rx="5" fill="rgba(148,163,184,0.22)" />
      <rect x="338" y="146" width="120" height="10" rx="5" fill="rgba(148,163,184,0.22)" />
      <rect x="478" y="146" width="120" height="10" rx="5" fill="rgba(148,163,184,0.22)" />
    </svg>
  );
}
