
import React from 'react';

// Strict Brand Color Palette for Avatars
const BRAND_COLORS = [
  'bg-[#d3a200]', // brand-primary
  'bg-[#f9dc5c]', // brand-secondary
  'bg-[#c41034]', // brand-tertiary
  'bg-[#65081b]', // brand-dark
];

const getColor = (name: string) => {
  if (!name) return BRAND_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % BRAND_COLORS.length);
  return BRAND_COLORS[index];
};

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className = '' }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const colorClass = getColor(name);
  
  // Contrast logic: brand-secondary is light, so use dark text. Others use white.
  const textClass = colorClass === 'bg-[#f9dc5c]' ? 'text-black' : 'text-white';

  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold uppercase tracking-tighter shadow-sm border border-white/10 ${sizeClasses[size]} ${colorClass} ${textClass} ${className}`}
      title={name}
    >
      {initial}
    </div>
  );
};

export default Avatar;
