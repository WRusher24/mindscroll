export function Logo({ size = 32, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="ms-logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#ms-logo-g)" />
        <rect x="19" y="13" width="26" height="38" rx="6" fill="none" stroke="#fff" strokeWidth="4" />
        <path d="M32 24v14m0 0-5-5m5 5 5-5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withWord && <span className="text-lg font-semibold tracking-tight">MindScroll</span>}
    </span>
  );
}
