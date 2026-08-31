export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="KittyFPS"
      role="img"
    >
      <defs>
        <linearGradient id="kittyPink" x1="40" y1="32" x2="216" y2="224" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F9A8D4" />
          <stop offset="0.55" stopColor="#EC4899" />
          <stop offset="1" stopColor="#F472B6" />
        </linearGradient>
        <linearGradient id="bowGrad" x1="60" y1="80" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FBCFE8" />
        </linearGradient>
        <filter id="kittyGlow" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 1  0 0.55 0.7 0 0.45  0 0 0.7 0 0.6  0 0 0 0.4 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ears */}
      <path d="M70 70 L96 130 L48 122 Z" fill="url(#kittyPink)" filter="url(#kittyGlow)" />
      <path d="M186 70 L208 122 L160 130 Z" fill="url(#kittyPink)" filter="url(#kittyGlow)" />

      {/* head */}
      <ellipse cx="128" cy="150" rx="78" ry="64" fill="url(#kittyPink)" filter="url(#kittyGlow)" />

      {/* bow on left ear */}
      <circle cx="78" cy="92" r="10" fill="url(#bowGrad)" />
      <path d="M68 92 L56 82 L56 102 Z" fill="url(#bowGrad)" />
      <path d="M88 92 L100 82 L100 102 Z" fill="url(#bowGrad)" />
      <circle cx="78" cy="92" r="3.5" fill="#EC4899" />

      {/* subtle shine on head */}
      <ellipse cx="104" cy="128" rx="22" ry="10" fill="#FFFFFF" opacity="0.35" />
    </svg>
  )
}
