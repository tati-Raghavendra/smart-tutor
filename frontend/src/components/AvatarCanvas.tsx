import { useState, useEffect, useRef } from 'react';
import type { AvatarTheme } from '../types';

interface AvatarCanvasProps {
  theme: AvatarTheme;
  isSpeaking: boolean;
  currentWord?: string;
  size?: 'sm' | 'md' | 'lg';
}

type MouthShape = 'closed' | 'open-small' | 'open-wide' | 'round';

export default function AvatarCanvas({
  theme,
  isSpeaking,
  currentWord = '',
  size = 'md',
}: AvatarCanvasProps) {
  const [mouthShape, setMouthShape] = useState<MouthShape>('closed');
  const [isBlinking, setIsBlinking] = useState(false);
  const speechIntervalRef = useRef<number | null>(null);

  // Natural blinking effect every 3.5 to 6 seconds
  useEffect(() => {
    let timeoutId: number;

    const scheduleNextBlink = () => {
      const nextDelay = 3000 + Math.random() * 3000;
      timeoutId = window.setTimeout(() => {
        setIsBlinking(true);
        window.setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 180);
      }, nextDelay);
    };

    scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  // Mouth movement synchronized with speech
  useEffect(() => {
    if (!isSpeaking) {
      const timer = window.setTimeout(() => setMouthShape('closed'), 0);
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
      return () => clearTimeout(timer);
    }

    const shapes: MouthShape[] = ['open-small', 'open-wide', 'round', 'open-small'];
    let idx = 0;

    // Fast, responsive lip articulation
    speechIntervalRef.current = window.setInterval(() => {
      // If currentWord contains vowels, favor wider shapes
      const vowels = (currentWord.match(/[aeiou]/gi) || []).length;
      if (vowels >= 2) {
        setMouthShape(Math.random() > 0.4 ? 'open-wide' : 'round');
      } else {
        idx = (idx + 1) % shapes.length;
        setMouthShape(shapes[idx]);
      }
    }, 110);

    return () => {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
    };
  }, [isSpeaking, currentWord]);

  // Dimensions
  const dimension = size === 'sm' ? 'w-24 h-24' : size === 'lg' ? 'w-64 h-64' : 'w-44 h-44';

  return (
    <div className={`relative flex items-center justify-center select-none ${dimension}`}>
      {/* Audio Halo Waves when speaking */}
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[115%] h-[115%] rounded-full border-2 border-indigo-400/40 animate-ping" />
          <div className="absolute w-[130%] h-[130%] rounded-full border border-indigo-300/25 animate-pulse" />
        </div>
      )}

      {/* SVG Avatar Character */}
      <svg
        viewBox="0 0 200 200"
        className={`w-full h-full drop-shadow-md transition-transform duration-300 ${
          isSpeaking ? 'scale-[1.02]' : 'scale-100'
        }`}
      >
        <defs>
          {/* Background Gradients */}
          <linearGradient id="bgGradSophia" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="bgGradAlex" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="bgGradNova" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>

          {/* Skin Gradients */}
          <linearGradient id="skinSophia" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe4d6" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>
          <linearGradient id="skinAlex" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>
          <linearGradient id="skinNova" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="100%" stopColor="#e9d5ff" />
          </linearGradient>
        </defs>

        {/* Circular Avatar Background Pod */}
        <circle
          cx="100"
          cy="100"
          r="95"
          fill={
            theme === 'sophia'
              ? 'url(#bgGradSophia)'
              : theme === 'alex'
              ? 'url(#bgGradAlex)'
              : 'url(#bgGradNova)'
          }
        />

        {/* Outer Rim Light */}
        <circle cx="100" cy="100" r="92" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.3" />

        {/* Character Group with slight speaking motion */}
        <g
          className={`transition-transform duration-200 ${
            isSpeaking ? 'translate-y-[-1px]' : 'translate-y-0'
          }`}
        >
          {/* Shoulders / Clothing */}
          {theme === 'sophia' && (
            <path
              d="M 38 185 C 45 145, 75 140, 100 140 C 125 140, 155 145, 162 185 Z"
              fill="#312e81"
            />
          )}
          {theme === 'alex' && (
            <path
              d="M 36 185 C 45 142, 75 138, 100 138 C 125 138, 155 142, 164 185 Z"
              fill="#0f172a"
            />
          )}
          {theme === 'nova' && (
            <path
              d="M 35 185 C 48 140, 75 135, 100 135 C 125 135, 152 140, 165 185 Z"
              fill="#581c87"
            />
          )}

          {/* Collar / Shirt Detail */}
          <polygon points="100,146 88,162 100,172 112,162" fill="#ffffff" opacity="0.9" />

          {/* Neck */}
          <rect
            x="88"
            y="118"
            width="24"
            height="26"
            rx="5"
            fill={theme === 'sophia' ? '#fed7aa' : theme === 'alex' ? '#fcd34d' : '#e9d5ff'}
          />

          {/* Head Base */}
          <ellipse
            cx="100"
            cy="90"
            rx="36"
            ry="42"
            fill={
              theme === 'sophia'
                ? 'url(#skinSophia)'
                : theme === 'alex'
                ? 'url(#skinAlex)'
                : 'url(#skinNova)'
            }
          />

          {/* Ears */}
          <ellipse
            cx="63"
            cy="92"
            rx="6"
            ry="9"
            fill={theme === 'sophia' ? '#fed7aa' : theme === 'alex' ? '#fcd34d' : '#e9d5ff'}
          />
          <ellipse
            cx="137"
            cy="92"
            rx="6"
            ry="9"
            fill={theme === 'sophia' ? '#fed7aa' : theme === 'alex' ? '#fcd34d' : '#e9d5ff'}
          />

          {/* Hair Back (Sophia long hair) */}
          {theme === 'sophia' && (
            <path
              d="M 64 85 C 55 110, 52 145, 68 160 C 62 135, 66 100, 72 80 Z"
              fill="#451a03"
            />
          )}
          {theme === 'sophia' && (
            <path
              d="M 136 85 C 145 110, 148 145, 132 160 C 138 135, 134 100, 128 80 Z"
              fill="#451a03"
            />
          )}

          {/* Hair Top / Front Styles */}
          {theme === 'sophia' && (
            <path
              d="M 64 82 C 60 50, 95 44, 100 44 C 105 44, 140 50, 136 82 C 128 66, 115 62, 100 64 C 85 62, 72 66, 64 82 Z"
              fill="#451a03"
            />
          )}
          {theme === 'alex' && (
            <path
              d="M 64 80 C 62 52, 85 45, 100 45 C 120 45, 138 52, 136 80 C 126 66, 114 62, 100 62 C 86 62, 74 66, 64 80 Z"
              fill="#1e293b"
            />
          )}
          {theme === 'nova' && (
            <g>
              <path
                d="M 64 80 C 60 48, 90 40, 100 40 C 110 40, 140 48, 136 80 C 128 64, 115 60, 100 60 C 85 60, 72 64, 64 80 Z"
                fill="#2e1065"
              />
              {/* Futuristic Cyber Visor / Headset for Nova */}
              <path
                d="M 62 82 C 62 76, 138 76, 138 82 L 135 90 C 135 90, 100 95, 65 90 Z"
                fill="#06b6d4"
                opacity="0.85"
              />
              <line x1="70" y1="86" x2="130" y2="86" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
            </g>
          )}

          {/* Eyebrows */}
          <path
            d={isSpeaking ? 'M 76 74 Q 85 71 92 74' : 'M 76 76 Q 85 73 92 75'}
            stroke={theme === 'sophia' ? '#451a03' : theme === 'alex' ? '#1e293b' : '#3b0764'}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={isSpeaking ? 'M 108 74 Q 115 71 124 74' : 'M 108 75 Q 115 73 124 76'}
            stroke={theme === 'sophia' ? '#451a03' : theme === 'alex' ? '#1e293b' : '#3b0764'}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Eyes (Open or Blinking) */}
          {theme !== 'nova' && (
            <>
              {isBlinking ? (
                // Eyelids closed
                <g stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none">
                  <path d="M 77 86 Q 84 90 91 86" />
                  <path d="M 109 86 Q 116 90 123 86" />
                </g>
              ) : (
                // Eyes open with sparkles
                <g>
                  {/* Left Eye */}
                  <ellipse cx="84" cy="85" rx="5" ry="6.5" fill="#1e293b" />
                  <circle cx="82.5" cy="83" r="1.8" fill="#ffffff" />
                  <circle cx="85.5" cy="86.5" r="0.8" fill="#ffffff" />

                  {/* Right Eye */}
                  <ellipse cx="116" cy="85" rx="5" ry="6.5" fill="#1e293b" />
                  <circle cx="114.5" cy="83" r="1.8" fill="#ffffff" />
                  <circle cx="117.5" cy="86.5" r="0.8" fill="#ffffff" />
                </g>
              )}
            </>
          )}

          {/* Cute glasses for Sophia */}
          {theme === 'sophia' && (
            <g stroke="#3730a3" strokeWidth="2" fill="none">
              <rect x="74" y="78" width="20" height="15" rx="4" />
              <rect x="106" y="78" width="20" height="15" rx="4" />
              <line x1="94" y1="85" x2="106" y2="85" />
            </g>
          )}

          {/* Nose */}
          <path
            d="M 99 92 Q 100 98 103 99"
            stroke="#ea580c"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
          />

          {/* Animated Mouth */}
          <g className="transition-all duration-75">
            {mouthShape === 'closed' && (
              // Friendly closed smile
              <path
                d="M 91 109 Q 100 116 109 109"
                stroke="#991b1b"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            )}

            {mouthShape === 'open-small' && (
              // Open slightly
              <ellipse cx="100" cy="111" rx="7" ry="4" fill="#7f1d1d" />
            )}

            {mouthShape === 'open-wide' && (
              // Vowels / Open Wide
              <g>
                <ellipse cx="100" cy="112" rx="9" ry="7.5" fill="#7f1d1d" />
                {/* Teeth top */}
                <path d="M 94 107 Q 100 109 106 107" fill="#ffffff" />
                {/* Tongue */}
                <ellipse cx="100" cy="116" rx="5" ry="3" fill="#f43f5e" opacity="0.9" />
              </g>
            )}

            {mouthShape === 'round' && (
              // Round 'o' / 'u' shape
              <ellipse cx="100" cy="112" rx="6.5" ry="6.5" fill="#7f1d1d" />
            )}
          </g>

          {/* Cheeks Blush */}
          <circle cx="73" cy="96" r="6" fill="#f43f5e" opacity="0.25" />
          <circle cx="127" cy="96" r="6" fill="#f43f5e" opacity="0.25" />
        </g>
      </svg>

      {/* Speaking Active Indicator badge */}
      {isSpeaking && (
        <span className="absolute bottom-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          TALKING
        </span>
      )}
    </div>
  );
}
