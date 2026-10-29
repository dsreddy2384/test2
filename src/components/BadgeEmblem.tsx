import React from 'react';
import { AchievementBadge } from '../badges';

interface BadgeEmblemProps {
  emblemType: AchievementBadge['emblemType'];
  unlocked: boolean;
  accentHex: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BadgeEmblem: React.FC<BadgeEmblemProps> = ({
  emblemType,
  unlocked,
  accentHex,
  size = 'md',
}) => {
  const dimensions =
    size === 'sm' ? 'w-11 h-11' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  const strokeColor = unlocked ? accentHex : '#94A3B8';
  const fillBg = unlocked ? `${accentHex}14` : '#F1F5F9';

  return (
    <div
      className={`${dimensions} rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-150 select-none`}
      style={{
        backgroundColor: fillBg,
        border: `1.5px solid ${unlocked ? `${accentHex}45` : '#E2E8F0'}`,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="w-3/5 h-3/5"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Shield / Medallion Ring */}
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeDasharray={unlocked ? undefined : '3 3'}
        />
        {unlocked && (
          <circle
            cx="24"
            cy="24"
            r="16.5"
            stroke={strokeColor}
            strokeOpacity="0.3"
            strokeWidth="1"
          />
        )}

        {emblemType === 'spark' && (
          <path
            d="M24 10L27.2 19.6L37 22.5L27.2 25.4L24 35L20.8 25.4L11 22.5L20.8 19.6L24 10Z"
            stroke={strokeColor}
            strokeWidth="2.2"
            strokeLinejoin="round"
            fill={unlocked ? `${accentHex}28` : 'none'}
          />
        )}

        {emblemType === 'chronicle' && (
          <>
            <rect
              x="15"
              y="13"
              width="18"
              height="22"
              rx="2.5"
              stroke={strokeColor}
              strokeWidth="2.2"
              fill={unlocked ? `${accentHex}22` : 'none'}
            />
            <path
              d="M19 19H29M19 24H29M19 29H25"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}

        {emblemType === 'bridge' && (
          <>
            <path
              d="M11 31H37M14 31V21C14 21 19 27 24 27C29 27 34 21 34 21V31"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19 25V31M24 27V31M29 25V31"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        )}

        {emblemType === 'wordsmith' && (
          <>
            <path
              d="M15 33L20 28L31 17C32.1 15.9 32.1 14.1 31 13C29.9 11.9 28.1 11.9 27 13L16 24L15 33Z"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
              fill={unlocked ? `${accentHex}24` : 'none'}
            />
            <path
              d="M14 34H34"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}

        {emblemType === 'century' && (
          <>
            <path
              d="M24 12V24L31 28"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="24" cy="24" r="3" fill={strokeColor} />
          </>
        )}

        {emblemType === 'compass' && (
          <>
            <polygon
              points="24,12 28,24 24,36 20,24"
              stroke={strokeColor}
              strokeWidth="2"
              fill={unlocked ? `${accentHex}28` : 'none'}
            />
            <polygon
              points="12,24 24,20 36,24 24,28"
              stroke={strokeColor}
              strokeWidth="1.8"
            />
          </>
        )}

        {emblemType === 'renaissance' && (
          <>
            <circle
              cx="20"
              cy="21"
              r="5.5"
              stroke={strokeColor}
              strokeWidth="2"
            />
            <circle
              cx="28"
              cy="21"
              r="5.5"
              stroke={strokeColor}
              strokeWidth="2"
            />
            <circle
              cx="24"
              cy="28"
              r="5.5"
              stroke={strokeColor}
              strokeWidth="2"
            />
          </>
        )}

        {emblemType === 'essay' && (
          <>
            <path
              d="M17 13H31V35L24 30L17 35V13Z"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
              fill={unlocked ? `${accentHex}24` : 'none'}
            />
            <circle cx="24" cy="21" r="2.5" fill={strokeColor} />
          </>
        )}

        {emblemType === 'laureate' && (
          <>
            <path
              d="M17 15H31V22C31 25.866 27.866 29 24 29C20.134 29 17 25.866 17 22V15Z"
              stroke={strokeColor}
              strokeWidth="2.2"
              fill={unlocked ? `${accentHex}24` : 'none'}
            />
            <path
              d="M24 29V34M19 34H29"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </>
        )}

        {emblemType === 'commonapp' && (
          <>
            <path
              d="M24 12L34 17V25C34 30.5 29.7 35.2 24 37C18.3 35.2 14 30.5 14 25V17L24 12Z"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
              fill={unlocked ? `${accentHex}25` : 'none'}
            />
            <path
              d="M19.5 24.5L22.5 27.5L29 21"
              stroke={strokeColor}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </div>
  );
};
