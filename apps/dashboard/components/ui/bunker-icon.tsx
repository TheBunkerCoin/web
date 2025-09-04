import React from 'react';

interface BunkerIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const BunkerIcon: React.FC<BunkerIconProps> = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`${sizeClasses[size]} bg-black rounded-full flex items-center justify-center ${className}`}>
      <img 
        src="/img/bunkercoin-icon.svg" 
        alt="BUNKER" 
        className="w-full h-full object-contain"
      />
    </div>
  );
};
