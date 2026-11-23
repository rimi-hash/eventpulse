import React from 'react';
import { VoiceState } from '../../types/assistant';

interface YasOctopusMascotProps {
  state?: VoiceState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export const YasOctopusMascot: React.FC<YasOctopusMascotProps> = ({
  state = 'idle',
  size = 'md',
  className = '',
  interactive = false,
  onClick,
}) => {
  // Dimensions per size preset
  const dimension = {
    sm: 32,
    md: 48,
    lg: 84,
    xl: 120,
  }[size];

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : 'img'}
      aria-label={`YAS Mascot - Status: ${state}`}
      className={`yas-octopus-container ${className}`}
      style={{
        width: `${dimension}px`,
        height: `${dimension}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <style>{`
        /* --- YAS OCTOPUS MOTION SYSTEM --- */
        @keyframes yas-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(1deg); }
        }

        @keyframes yas-listening-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(249, 115, 22, 0.4)); }
          50% { transform: scale(1.06); filter: drop-shadow(0 0 12px rgba(249, 115, 22, 0.8)); }
        }

        @keyframes yas-thinking-sway {
          0%, 100% { transform: rotate(-3deg) translateY(0); }
          50% { transform: rotate(3deg) translateY(-3px); }
        }

        @keyframes yas-executing-spin {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.04) rotate(4deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes yas-success-bounce {
          0%, 100% { transform: scale(1) translateY(0); }
          40% { transform: scale(1.12, 0.9) translateY(-8px); }
          70% { transform: scale(0.95, 1.05) translateY(-2px); }
        }

        @keyframes yas-error-wobble {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-4deg); }
          75% { transform: translateX(4px) rotate(4deg); }
        }

        /* Staggered Tentacle Waves */
        @keyframes yas-tentacle-wobble-1 { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(8deg); } }
        @keyframes yas-tentacle-wobble-2 { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-10deg); } }
        @keyframes yas-tentacle-wobble-3 { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(12deg); } }
        @keyframes yas-tentacle-wobble-4 { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-12deg); } }

        /* Ripple Waves for Listening State */
        @keyframes yas-soundwave {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        .yas-mascot-svg {
          transform-origin: center bottom;
          transition: transform 0.3s ease, filter 0.3s ease;
        }

        .yas-state-idle .yas-mascot-svg {
          animation: yas-float 3.5s ease-in-out infinite;
        }

        .yas-state-listening .yas-mascot-svg {
          animation: yas-listening-pulse 1.4s ease-in-out infinite;
        }

        .yas-state-thinking .yas-mascot-svg,
        .yas-state-processing .yas-mascot-svg {
          animation: yas-thinking-sway 2s ease-in-out infinite;
        }

        .yas-state-executing .yas-mascot-svg {
          animation: yas-executing-spin 1.2s ease-in-out infinite;
        }

        .yas-state-success .yas-mascot-svg {
          animation: yas-success-bounce 0.8s ease-out 1;
        }

        .yas-state-error .yas-mascot-svg {
          animation: yas-error-wobble 0.6s ease-in-out 1;
        }

        /* Tentacle waving animations with staggered timing */
        .yas-t1 { transform-origin: 18px 58px; animation: yas-tentacle-wobble-1 2.2s ease-in-out infinite; }
        .yas-t2 { transform-origin: 28px 62px; animation: yas-tentacle-wobble-2 2.6s ease-in-out 0.2s infinite; }
        .yas-t3 { transform-origin: 38px 64px; animation: yas-tentacle-wobble-1 2.4s ease-in-out 0.4s infinite; }
        .yas-t4 { transform-origin: 48px 64px; animation: yas-tentacle-wobble-2 2.8s ease-in-out 0.1s infinite; }
        .yas-t5 { transform-origin: 58px 64px; animation: yas-tentacle-wobble-1 2.5s ease-in-out 0.5s infinite; }
        .yas-t6 { transform-origin: 68px 64px; animation: yas-tentacle-wobble-2 2.3s ease-in-out 0.3s infinite; }
        .yas-t7 { transform-origin: 78px 62px; animation: yas-tentacle-wobble-1 2.7s ease-in-out 0.6s infinite; }
        .yas-t8 { transform-origin: 88px 58px; animation: yas-tentacle-wobble-2 2.1s ease-in-out 0.2s infinite; }

        @media (prefers-reduced-motion: reduce) {
          .yas-mascot-svg,
          .yas-t1, .yas-t2, .yas-t3, .yas-t4,
          .yas-t5, .yas-t6, .yas-t7, .yas-t8 {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Radiant Audio Pulse Ripple (Listening Mode) */}
      {state === 'listening' && (
        <span
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid #fb923c',
            animation: 'yas-soundwave 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* The Vivid Orange Octopus Mascot SVG */}
      <svg
        className={`yas-mascot-svg yas-state-${state}`}
        viewBox="0 0 100 100"
        width={dimension}
        height={dimension}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Body Gradient: Warm vivid orange with highlights */}
          <linearGradient id="yas-body-grad" x1="20" y1="10" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff7844" />
            <stop offset="45%" stopColor="#f95716" />
            <stop offset="100%" stopColor="#d83a00" />
          </linearGradient>

          {/* Head Specular Highlight */}
          <linearGradient id="yas-highlight-grad" x1="30" y1="12" x2="60" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Suction Cups Gradient */}
          <linearGradient id="yas-suction-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>

          {/* Eye Sparkle Filter */}
          <filter id="yas-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* --- 8 Distinguishable Tentacles --- */}
        {/* Tentacle 1 (Far Left) */}
        <g className="yas-t1">
          <path
            d="M22 55 C12 55 4 62 6 72 C8 80 18 80 20 72 C22 65 24 60 27 58"
            fill="url(#yas-body-grad)"
          />
          <circle cx="10" cy="72" r="2" fill="url(#yas-suction-grad)" opacity="0.9" />
          <circle cx="16" cy="74" r="2" fill="url(#yas-suction-grad)" opacity="0.9" />
        </g>

        {/* Tentacle 2 (Mid Left Outer) */}
        <g className="yas-t2">
          <path
            d="M28 58 C20 62 14 70 16 80 C18 87 26 86 28 78 C30 70 32 63 34 60"
            fill="url(#yas-body-grad)"
          />
          <circle cx="18" cy="79" r="2.2" fill="url(#yas-suction-grad)" opacity="0.9" />
          <circle cx="24" cy="81" r="2.2" fill="url(#yas-suction-grad)" opacity="0.9" />
        </g>

        {/* Tentacle 3 (Mid Left Inner) */}
        <g className="yas-t3">
          <path
            d="M36 60 C30 66 26 76 30 85 C33 91 40 89 40 81 C40 73 40 66 41 62"
            fill="url(#yas-body-grad)"
          />
          <circle cx="31" cy="84" r="2.4" fill="url(#yas-suction-grad)" opacity="0.9" />
          <circle cx="37" cy="85" r="2.4" fill="url(#yas-suction-grad)" opacity="0.9" />
        </g>

        {/* Tentacle 4 (Center Left) */}
        <g className="yas-t4">
          <path
            d="M44 62 C40 70 38 80 44 90 C47 94 52 93 52 86 C52 78 49 70 48 62"
            fill="url(#yas-body-grad)"
          />
          <circle cx="45" cy="88" r="2.4" fill="url(#yas-suction-grad)" opacity="0.9" />
        </g>

        {/* Tentacle 5 (Center Right) */}
        <g className="yas-t5">
          <path
            d="M56 62 C58 70 56 80 50 88 C48 93 54 94 57 88 C62 80 60 70 56 62"
            fill="url(#yas-body-grad)"
          />
          <circle cx="55" cy="87" r="2.4" fill="url(#yas-suction-grad)" opacity="0.9" />
        </g>

        {/* Tentacle 6 (Mid Right Inner) */}
        <g className="yas-t6">
          <path
            d="M60 62 C63 68 64 76 60 84 C58 89 66 90 68 83 C71 75 67 67 62 60"
            fill="url(#yas-body-grad)"
          />
          <circle cx="63" cy="83" r="2.4" fill="url(#yas-suction-grad)" opacity="0.9" />
          <circle cx="68" cy="81" r="2.4" fill="url(#yas-suction-grad)" opacity="0.9" />
        </g>

        {/* Tentacle 7 (Mid Right Outer) */}
        <g className="yas-t7">
          <path
            d="M66 59 C71 63 78 70 76 79 C74 86 82 86 84 78 C86 70 78 62 72 57"
            fill="url(#yas-body-grad)"
          />
          <circle cx="77" cy="79" r="2.2" fill="url(#yas-suction-grad)" opacity="0.9" />
          <circle cx="83" cy="76" r="2.2" fill="url(#yas-suction-grad)" opacity="0.9" />
        </g>

        {/* Tentacle 8 (Far Right) */}
        <g className="yas-t8">
          <path
            d="M73 57 C78 59 87 63 92 70 C96 76 90 82 84 76 C80 72 78 64 74 56"
            fill="url(#yas-body-grad)"
          />
          <circle cx="88" cy="73" r="2" fill="url(#yas-suction-grad)" opacity="0.9" />
          <circle cx="83" cy="71" r="2" fill="url(#yas-suction-grad)" opacity="0.9" />
        </g>

        {/* --- Rounded Dome Head & Body --- */}
        <path
          d="M20 48 C18 30 32 14 50 14 C68 14 82 30 80 48 C79 58 72 63 50 63 C28 63 21 58 20 48 Z"
          fill="url(#yas-body-grad)"
          filter="url(#yas-glow)"
        />

        {/* Head 3D Specular Highlight */}
        <ellipse
          cx="42"
          cy="26"
          rx="18"
          ry="10"
          transform="rotate(-15 42 26)"
          fill="url(#yas-highlight-grad)"
        />

        {/* Cheeks (Blushing Rosy Warmth) */}
        <ellipse cx="30" cy="48" rx="4" ry="2.5" fill="#ea580c" opacity="0.4" />
        <ellipse cx="70" cy="48" rx="4" ry="2.5" fill="#ea580c" opacity="0.4" />

        {/* --- Expressive Eyes Based on State --- */}
        {state === 'success' ? (
          // Joyful smiling eye arcs (^^)
          <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round">
            <path d="M33 42 Q39 36 45 42" />
            <path d="M55 42 Q61 36 67 42" />
          </g>
        ) : state === 'error' ? (
          // Sympathetic apologetic eyes
          <g>
            <circle cx="39" cy="42" r="5" fill="#ffffff" />
            <circle cx="61" cy="42" r="5" fill="#ffffff" />
            <circle cx="40" cy="43" r="3" fill="#1e293b" />
            <circle cx="60" cy="43" r="3" fill="#1e293b" />
            {/* Gentle downturn eyebrows */}
            <path d="M34 35 Q40 37 44 38" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M66 35 Q60 37 56 38" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        ) : (
          // Default & Active Intelligent Eyes (Wide, friendly, alert)
          <g>
            {/* Sclera */}
            <ellipse cx="38" cy="41" rx="6" ry="7" fill="#ffffff" />
            <ellipse cx="62" cy="41" rx="6" ry="7" fill="#ffffff" />

            {/* Iris / Pupil */}
            <circle cx={state === 'thinking' ? 39 : 38} cy={state === 'thinking' ? 39 : 41} r="4" fill="#0f172a" />
            <circle cx={state === 'thinking' ? 63 : 62} cy={state === 'thinking' ? 39 : 41} r="4" fill="#0f172a" />

            {/* High-Key Eye Catchlights */}
            <circle cx={state === 'thinking' ? 40 : 36.5} cy={state === 'thinking' ? 38 : 39.5} r="1.6" fill="#ffffff" />
            <circle cx={state === 'thinking' ? 64 : 60.5} cy={state === 'thinking' ? 38 : 39.5} r="1.6" fill="#ffffff" />
            <circle cx={state === 'thinking' ? 38 : 39.5} cy={state === 'thinking' ? 40 : 42.5} r="0.8" fill="#ffffff" />
            <circle cx={state === 'thinking' ? 62 : 63.5} cy={state === 'thinking' ? 40 : 42.5} r="0.8" fill="#ffffff" />
          </g>
        )}

        {/* Friendly Little Smile */}
        {state !== 'error' ? (
          <path
            d="M47 49 Q50 52 53 49"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d="M48 51 Q50 49 52 51"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
};
