import React, { useState } from 'react';
import maguvaLogoImg from '../assets/images/maguva_left_facing_outline_logo_1786898103011.jpg';

interface MahuaEmblemProps {
  className?: string;
  size?: number;
}

export const MahuaEmblem: React.FC<MahuaEmblemProps> = ({ className = '', size = 42 }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      id="mahua-emblem-container"
      className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF5F7] via-[#FCE7F3] to-[#FFE4E6] p-1 border border-[#FCE7F3] shadow-xs overflow-hidden shrink-0 group ${className}`}
      style={{ width: size, height: size }}
      title="Maguva — Woman Facing Left with Pink Outline Holding Mahua Flowers"
    >
      {!imageError ? (
        <img
          src={maguvaLogoImg}
          alt="Maguva Logo - Serene woman facing left with pink outline holding outline Mahua flowers"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
      ) : (
        /* Pure Outline Vector: Woman Facing Left and Mahua Flowers with Outline Only */
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Subtle Outer Halo Ring */}
          <circle cx="50" cy="50" r="46" stroke="#FCE7F3" strokeWidth="1" />
          <circle cx="50" cy="50" r="42" stroke="#F43F5E" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

          {/* Gentle Healing Sparkles in Outline */}
          <path d="M82 22L84 18L86 22L90 24L86 26L84 30L82 26L78 24Z" stroke="#F43F5E" strokeWidth="1" fill="none" />
          <path d="M16 28L18 25L20 28L23 30L20 32L18 35L16 32L13 30Z" stroke="#D97706" strokeWidth="1" fill="none" />

          {/* Woman Side Profile Facing LEFT with Pink Outline */}
          {/* Graceful Hair Flowing Back to the Right */}
          <path
            d="M50 20C40 20 32 28 32 36C32 40 34 44 38 46C36 49 33 54 30 58C38 56 46 54 54 50C64 45 74 36 74 24C66 19 58 20 50 20Z"
            stroke="#E11D48"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Serene Forehead, Nose, Lips and Chin Facing LEFT */}
          <path
            d="M40 28C36 30 33 33 32 37C30 39 31 41 33 42C31 43.5 32 45.5 34 46C33 48 35 50 38 51C42 53 46 54 48 57"
            stroke="#F43F5E"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Peaceful Closed Eye & Gentle Smile */}
          <path d="M37 36C39 38 41 38 43 36" stroke="#E11D48" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M35 44C37 45.5 39 45.5 41 44" stroke="#F43F5E" strokeWidth="1.2" strokeLinecap="round" />

          {/* Slender Neck & Shoulders */}
          <path
            d="M48 57C46 64 38 72 26 84H78C76 72 70 60 62 55"
            stroke="#F43F5E"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Cupped Hands on the Left holding Mahua flowers */}
          <path
            d="M30 68C24 72 22 78 26 82C32 82 38 78 44 74C38 74 34 72 30 68Z"
            stroke="#E11D48"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M36 72C30 76 28 80 32 84C38 84 44 80 50 76"
            stroke="#F43F5E"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Blooming Mahua (Madhuca longifolia) Flower Cluster on Left in Outline Only */}
          <circle cx="28" cy="62" r="4.5" stroke="#D97706" strokeWidth="1.4" fill="none" />
          <path d="M28 57.5C26 53 30 53 28 57.5Z" stroke="#D97706" strokeWidth="1.2" fill="none" />
          <path d="M28 66.5C26 71 30 71 28 66.5Z" stroke="#D97706" strokeWidth="1.2" fill="none" />
          <path d="M23.5 62C19 60 19 64 23.5 62Z" stroke="#D97706" strokeWidth="1.2" fill="none" />
          <path d="M32.5 62C37 60 37 64 32.5 62Z" stroke="#D97706" strokeWidth="1.2" fill="none" />

          {/* Secondary Outline Flower & Leaves */}
          <circle cx="36" cy="58" r="3.5" stroke="#F43F5E" strokeWidth="1.2" strokeDasharray="1 1" fill="none" />
          <path d="M24 54C21 50 23 46 27 45C29 49 28 53 24 54Z" stroke="#10B981" strokeWidth="1.2" fill="none" />
          <path d="M18 64C14 62 12 58 14 55C17 57 18 61 18 64Z" stroke="#10B981" strokeWidth="1.2" fill="none" />
        </svg>
      )}
    </div>
  );
};

