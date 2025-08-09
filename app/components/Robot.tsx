// components/Robot.tsx
export default function Robot({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#dce7ff" />
        </linearGradient>
        <linearGradient id="g2" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#9bd7ff" />
          <stop offset="100%" stopColor="#66b2ff" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#111827" floodOpacity="0.18"/>
        </filter>
      </defs>

      {/* body */}
      <g filter="url(#shadow)">
        <rect x="40" y="70" rx="24" ry="24" width="160" height="120" fill="url(#g1)" />
        {/* head */}
        <rect x="70" y="25" rx="18" ry="18" width="100" height="60" fill="url(#g1)" />
        {/* antenna */}
        <circle cx="120" cy="18" r="6" fill="#33D78F" />
        <rect x="118" y="18" width="4" height="10" fill="#33D78F" />
        {/* eyes */}
        <circle cx="95" cy="55" r="8" fill="#111827" />
        <circle cx="145" cy="55" r="8" fill="#111827" />
        {/* smile */}
        <path d="M95 70 Q120 88 145 70" stroke="#0ea5e9" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* chest panel */}
        <rect x="65" y="95" width="110" height="60" rx="12" fill="url(#g2)" />
        <rect x="75" y="105" width="90" height="10" rx="5" fill="#fff" opacity=".9"/>
        <rect x="75" y="123" width="55" height="10" rx="5" fill="#fff" opacity=".9"/>
        <rect x="135" y="123" width="30" height="10" rx="5" fill="#fff" opacity=".9"/>
      </g>

      {/* waving hand */}
      <g className="origin-[170px_145px]" style={{ transformOrigin: "170px 145px" }}>
        <g>
          <rect x="165" y="145" width="40" height="10" rx="5" fill="#66b2ff" />
          <circle cx="207" cy="150" r="10" fill="#66b2ff" />
        </g>
      </g>
    </svg>
  );
}