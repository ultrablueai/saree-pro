'use client';

import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  withBorder?: boolean;
  withShadow?: boolean;
  animated?: boolean;
}

export function GlassPanel({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  rounded = 'lg',
  withBorder = true,
  withShadow = true,
  animated = false,
}: GlassPanelProps) {
  const baseClasses = 'backdrop-blur-xl transition-all duration-300';
  
  const variantClasses = {
    default: 'bg-white/10 dark:bg-black/20',
    elevated: 'bg-white/15 dark:bg-black/25',
    subtle: 'bg-white/5 dark:bg-black/10',
  };

  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  };

  const borderClasses = withBorder 
    ? 'border border-white/20 dark:border-white/10' 
    : '';

  const shadowClasses = withShadow
    ? 'shadow-lg shadow-black/10 dark:shadow-black/30'
    : '';

  const animationClasses = animated
    ? 'hover:scale-[1.02] hover:bg-white/20 dark:hover:bg-black/30'
    : '';

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        roundedClasses[rounded],
        borderClasses,
        shadowClasses,
        animationClasses,
        className
      )}
    >
      {children}
    </div>
  );
}
