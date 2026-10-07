// Room scene for the signature entry (Phase 06.1): an arched window as the
// visible light source, wall reveal, sill, floor with the projected sunlight
// patch, a ceramic bowl — and a small seated child looking up at the mobile.
//
// Everything is hand-built vector (no photo, no stock, no AI image). The child
// is deliberately stylised and seen from behind: no face, no identity, nothing
// uncanny — a presence, not a portrait. Decorative only (aria-hidden).
//
// Coordinates: viewBox 0 0 1000 1100. Light enters from the upper right.

export const SCENE = { w: 1000, h: 1100 };

export function RoomBackdrop({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="rs-bloom" cx="58%" cy="40%" r="58%">
          <stop offset="0" stopColor="#FFF8EC" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#FCE7D0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#F6DCC4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rs-reveal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D9B898" />
          <stop offset="0.5" stopColor="#ECD6BF" />
          <stop offset="1" stopColor="#F9EBDC" />
        </linearGradient>
        <linearGradient id="rs-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFDF8" />
          <stop offset="0.6" stopColor="#FFF6EA" />
          <stop offset="1" stopColor="#FBE9D4" />
        </linearGradient>
        <radialGradient id="rs-sun" cx="72%" cy="22%" r="60%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.4" stopColor="#FFFBF2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFF4E4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rs-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9D2BB" stopOpacity="0" />
          <stop offset="0.35" stopColor="#E7CDB4" stopOpacity="0.6" />
          <stop offset="1" stopColor="#DDBFA2" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="rs-patch" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6E6" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFE9CC" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="rs-bowl" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#CDB9A4" />
          <stop offset="0.6" stopColor="#F4EBE0" />
          <stop offset="1" stopColor="#FFF8EE" />
        </linearGradient>
        <linearGradient id="rs-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.14" stopColor="#fff" />
          <stop offset="0.9" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="rs-floormask">
          <rect x="0" y="0" width="1000" height="1100" fill="url(#rs-fade)" />
        </mask>
        <filter id="rs-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="rs-haze" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <clipPath id="rs-glassclip">
          <path d="M330 840 V350 A230 230 0 0 1 790 350 V840 Z" />
        </clipPath>
      </defs>

      {/* daylight bloom on the wall around the opening */}
      <ellipse cx="580" cy="440" rx="560" ry="560" fill="url(#rs-bloom)" />

      {/* window reveal: wall thickness, shaded on the far side */}
      <path d="M282 862 V350 A278 278 0 0 1 838 350 V862 Z" fill="url(#rs-reveal)" />
      {/* glass and the bright garden haze beyond */}
      <g clipPath="url(#rs-glassclip)">
        <rect x="320" y="100" width="480" height="760" fill="url(#rs-glass)" />
        <ellipse cx="420" cy="760" rx="160" ry="90" fill="#D8DDBE" opacity="0.55" filter="url(#rs-haze)" />
        <ellipse cx="700" cy="790" rx="190" ry="80" fill="#E3D9B4" opacity="0.5" filter="url(#rs-haze)" />
        <ellipse cx="640" cy="230" rx="260" ry="220" fill="url(#rs-sun)" />
      </g>
      {/* frame + mullions (thin, warm white) */}
      <g fill="none" stroke="#EADBC8" strokeLinecap="butt">
        <path d="M330 840 V350 A230 230 0 0 1 790 350 V840" strokeWidth="12" />
        <line x1="560" y1="122" x2="560" y2="840" strokeWidth="7" />
        <line x1="330" y1="520" x2="790" y2="520" strokeWidth="7" />
      </g>
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.7">
        <path d="M337 840 V350 A223 223 0 0 1 783 350 V840" strokeWidth="2" />
      </g>
      {/* sill */}
      <rect x="268" y="852" width="584" height="20" rx="3" fill="#F6E9D9" />
      <rect x="268" y="870" width="584" height="10" fill="#C9A88A" opacity="0.35" filter="url(#rs-soft)" />

      {/* floor and baseboard */}
      <g mask="url(#rs-floormask)">
        <rect x="0" y="930" width="1000" height="170" fill="url(#rs-floor)" />
        {/* sunlight thrown through the window onto the floor, mullion shadows inside */}
        <g filter="url(#rs-soft)" opacity="0.95">
          <path d="M520 948 L860 948 L700 1100 L180 1100 Z" fill="url(#rs-patch)" />
          <path d="M688 948 L700 948 L452 1100 L432 1100 Z" fill="#E2C6A8" opacity="0.6" />
          <path d="M600 1010 L790 1010 L776 1022 L560 1022 Z" fill="#E2C6A8" opacity="0.5" />
        </g>
      </g>

      {/* ceramic bowl on the floor, lit from the right */}
      <ellipse cx="300" cy="1052" rx="86" ry="11" fill="#7A5638" opacity="0.2" filter="url(#rs-soft)" />
      <path d="M232 1002 C234 1036 262 1050 300 1050 C338 1050 366 1036 368 1002 Z" fill="url(#rs-bowl)" />
      <ellipse cx="300" cy="1002" rx="68" ry="9" fill="#EFE3D5" />
      <ellipse cx="300" cy="1003.5" rx="60" ry="6" fill="#D9C7B3" />
    </svg>
  );
}

/** Small seated child, seen from behind, head tilted up toward the mobile. */
export function SeatedChild({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-170 -262 310 280" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ch-sweater" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C97F64" />
          <stop offset="0.55" stopColor="#E3A189" />
          <stop offset="1" stopColor="#F3C2AA" />
        </linearGradient>
        <linearGradient id="ch-trousers" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B49576" />
          <stop offset="0.6" stopColor="#D2B999" />
          <stop offset="1" stopColor="#E8D8C0" />
        </linearGradient>
        <radialGradient id="ch-hair" cx="70%" cy="25%" r="85%">
          <stop offset="0" stopColor="#A47454" />
          <stop offset="0.45" stopColor="#7B5238" />
          <stop offset="1" stopColor="#583826" />
        </radialGradient>
        <linearGradient id="ch-skin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D9A07F" />
          <stop offset="1" stopColor="#F2C6A7" />
        </linearGradient>
        <filter id="ch-soft" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* contact shadow, thrown to the left (sun from the right) */}
      <ellipse cx="-34" cy="2" rx="118" ry="13" fill="#6E4A30" opacity="0.22" filter="url(#ch-soft)" />

      {/* crossed legs */}
      <path d="M-104 -4 C-112 -44 -50 -58 -2 -52 C46 -58 104 -46 98 -8 C96 8 -98 12 -104 -4 Z" fill="url(#ch-trousers)" />
      <path d="M-70 -12 C-40 -2 30 -2 72 -14" fill="none" stroke="#A88A6B" strokeWidth="2.5" opacity="0.5" />
      <path d="M-112 -10 C-116 -22 -100 -28 -88 -22 C-80 -16 -86 -4 -98 -3 C-106 -3 -110 -6 -112 -10 Z" fill="#D9C2A8" />
      <path d="M104 -12 C108 -24 94 -30 82 -24 C74 -18 80 -6 92 -5 C100 -5 102 -8 104 -12 Z" fill="#EEDCC6" />

      {/* back + sweater */}
      <path d="M-58 -34 C-68 -86 -62 -134 -42 -152 C-22 -166 24 -166 44 -152 C64 -134 68 -86 58 -34 C30 -24 -30 -24 -58 -34 Z" fill="url(#ch-sweater)" />
      {/* arms resting on the knees */}
      <path d="M-44 -142 C-70 -110 -76 -72 -62 -46" fill="none" stroke="#CF8A6F" strokeWidth="24" strokeLinecap="round" />
      <path d="M46 -142 C72 -110 78 -72 64 -46" fill="none" stroke="#EEB49B" strokeWidth="24" strokeLinecap="round" />
      <ellipse cx="-60" cy="-40" rx="11" ry="9" fill="url(#ch-skin)" />
      <ellipse cx="64" cy="-40" rx="11" ry="9" fill="#F2C6A7" />
      {/* knit rib at the hem */}
      <path d="M-56 -40 C-28 -30 30 -30 58 -40" fill="none" stroke="#C97F64" strokeWidth="6" opacity="0.45" />

      {/* neck + head, tilted up and slightly left toward the mobile */}
      <rect x="-12" y="-176" width="24" height="22" rx="9" fill="#DDA585" />
      <g transform="rotate(-14 0 -205)">
        <circle cx="-4" cy="-203" r="39" fill="url(#ch-skin)" />
        {/* seen from behind: hair covers the head, a sliver of cheek and the ear show on the left */}
        <circle cx="3" cy="-206" r="40" fill="url(#ch-hair)" />
        <ellipse cx="-34" cy="-196" rx="6.5" ry="9" fill="#D99D7C" />
        <g fill="none" stroke="#4E311F" strokeLinecap="round" opacity="0.45">
          <path d="M-14 -238 C2 -230 14 -214 16 -188" strokeWidth="2" />
          <path d="M8 -244 C24 -232 32 -214 30 -192" strokeWidth="2" />
          <path d="M-26 -226 C-14 -214 -8 -198 -10 -180" strokeWidth="2" />
        </g>
        <path d="M14 -241 C28 -232 38 -218 40 -204" fill="none" stroke="#C99772" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* rim light from the window (right) */}
      <g fill="none" stroke="#FFF1DC" strokeLinecap="round" opacity="0.45">
        <path d="M58 -40 C66 -86 62 -130 46 -150" strokeWidth="3" />
        <path d="M30 -238 C42 -226 46 -206 40 -186" strokeWidth="3" />
        <path d="M80 -34 C90 -24 92 -14 88 -6" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
