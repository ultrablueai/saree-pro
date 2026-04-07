'use client';

import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'glass' | 'minimal';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export function PremiumCard({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  rounded = 'lg',
  hover = true,
  clickable = false,
  onClick,
}: PremiumCardProps) {
  const baseClasses = 'transition-all duration-300';
  
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl',
    glass: 'backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10',
    minimal: 'bg-transparent border-0',
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

  const hoverClasses = hover && !clickable
    ? 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
    : '';

  const clickableClasses = clickable
    ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
    : '';

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        roundedClasses[rounded],
        hoverClasses,
        clickableClasses,
        className
      )}
      onClick={clickable ? onClick : undefined}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}
