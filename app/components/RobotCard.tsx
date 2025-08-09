// app/components/RobotCard.tsx
"use client";
import { ReactNode, useEffect, useRef, useState } from "react";

export default function RobotCard({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  // Animation state (blink & smile) elided for brevity; you can
  // re-copy the CSS keyframes & hooks from my last message.

  return (
    <div className={`relative ${className}`}>
      {/* Head */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-32 bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-3xl border-2 border-slate-400">
        {/* antenna, eyes, mouth... */}
      </div>

      {/* Body */}
      <div className="absolute top-28 left-1/2 transform -translate-x-1/2 w-48 h-56 bg-gradient-to-b from-slate-300 to-slate-400 rounded-2xl border-2 border-slate-400">
        {/* Chest panel: your form goes here */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-36 h-44 bg-sky-100 rounded-xl border border-sky-300 p-3 pointer-events-auto">
          {children}
        </div>
      </div>

      {/* Arms & legs */}
      <div className="absolute top-32 left-4 w-8 h-28 bg-slate-400 rounded-full border border-slate-500 transform -rotate-12" />
      <div className="absolute top-32 right-4 w-8 h-28 bg-slate-400 rounded-full border border-slate-500 transform rotate-12" />
      <div className="absolute bottom-0 left-12 w-8 h-24 bg-slate-400 rounded-full border border-slate-500" />
      <div className="absolute bottom-0 right-12 w-8 h-24 bg-slate-400 rounded-full border border-slate-500" />
    </div>
  );
}