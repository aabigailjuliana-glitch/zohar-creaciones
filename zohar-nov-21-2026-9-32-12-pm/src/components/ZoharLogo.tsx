import React from 'react';

interface ZoharLogoProps {
  className?: string;
  showBadge?: boolean;
}

export const ZoharLogo: React.FC<ZoharLogoProps> = ({
  className = 'w-9 h-9',
  showBadge = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${
        showBadge
          ? 'rounded-2xl p-1 bg-white dark:bg-neutral-900 border border-pink-200 dark:border-pink-800 shadow-xs'
          : ''
      } ${className}`}
    >
      <img
        src="/assets/aistudio/5x5_20261013_095819_0000_df4c0100.png"
        alt="ZOHAR"
        className="w-full h-full object-contain select-none"
        loading="eager"
      />
    </div>
  );
};
