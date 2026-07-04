import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowing?: boolean;
  hoverGlow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glowing = false,
  hoverGlow = false,
  className = '',
  ...props
}) => {
  const baseClass = glowing ? 'glass-panel-glow' : 'glass-panel';
  const hoverClass = hoverGlow 
    ? 'hover:border-brand-primary/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-300' 
    : '';

  return (
    <div
      className={`rounded-2xl p-6 ${baseClass} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
