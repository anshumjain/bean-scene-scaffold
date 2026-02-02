import React from 'react';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LevelBadge({ level, size = 'sm', className }: LevelBadgeProps) {
  const getLevelStyle = (level: number) => {
    if (level >= 20) {
      return {
        bg: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
        text: 'text-yellow-900',
        border: 'border-yellow-500',
        label: 'Legend'
      };
    } else if (level >= 15) {
      return {
        bg: 'bg-gradient-to-r from-purple-500 to-purple-700',
        text: 'text-purple-100',
        border: 'border-purple-400',
        label: 'Master'
      };
    } else if (level >= 10) {
      return {
        bg: 'bg-gradient-to-r from-blue-500 to-blue-700',
        text: 'text-blue-100',
        border: 'border-blue-400',
        label: 'Expert'
      };
    } else if (level >= 5) {
      return {
        bg: 'bg-gradient-to-r from-green-500 to-green-700',
        text: 'text-green-100',
        border: 'border-green-400',
        label: 'Pro'
      };
    } else {
      return {
        bg: 'bg-gradient-to-r from-gray-400 to-gray-600',
        text: 'text-gray-100',
        border: 'border-gray-300',
        label: 'New'
      };
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          container: 'h-5 px-1.5 text-xs',
          text: 'text-xs'
        };
      case 'md':
        return {
          container: 'h-6 px-2 text-sm',
          text: 'text-sm'
        };
      case 'lg':
        return {
          container: 'h-8 px-3 text-base',
          text: 'text-base'
        };
    }
  };

  const levelStyle = getLevelStyle(level);
  const sizeClasses = getSizeClasses(size);

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        levelStyle.bg,
        levelStyle.text,
        levelStyle.border,
        sizeClasses.container,
        className
      )}
    >
      <span className={sizeClasses.text}>
        L{level}
      </span>
    </div>
  );
}

// Helper component for showing level with username
interface UserLevelDisplayProps {
  username: string;
  level: number;
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

export function UserLevelDisplay({ 
  username, 
  level, 
  showLabel = false, 
  className,
  onClick,
  clickable = false
}: UserLevelDisplayProps) {
  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('font-medium', clickable && 'hover:text-primary cursor-pointer transition-colors')}>
        @{username}
      </span>
      <LevelBadge level={level} size="sm" />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {level >= 20 ? 'Legend' : level >= 15 ? 'Master' : level >= 10 ? 'Expert' : level >= 5 ? 'Pro' : 'New'}
        </span>
      )}
    </div>
  );

  if (clickable && onClick) {
    return (
      <button onClick={onClick} className="text-left">
        {content}
      </button>
    );
  }

  return content;
}
