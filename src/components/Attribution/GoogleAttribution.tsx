import { ExternalLink } from "lucide-react";

interface GoogleAttributionProps {
  type: 'photo' | 'review' | 'rating' | 'info';
  sourceUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: {
    container: 'text-[10px] gap-1 px-1.5 py-0.5',
    icon: 'w-3 h-3',
    linkIcon: 'w-2.5 h-2.5'
  },
  md: {
    container: 'text-[12px] gap-1.5 px-2 py-1',
    icon: 'w-3.5 h-3.5',
    linkIcon: 'w-3 h-3'
  },
  lg: {
    container: 'text-[14px] gap-2 px-2.5 py-1.5',
    icon: 'w-4 h-4',
    linkIcon: 'w-3.5 h-3.5'
  }
};

const typeLabels = {
  photo: 'Photo via Google',
  review: 'Review from Google',
  rating: 'Google rating',
  info: 'Info from Google'
};

export function GoogleAttribution({ 
  type, 
  sourceUrl, 
  size = 'md', 
  className = '' 
}: GoogleAttributionProps) {
  const sizeClass = sizeClasses[size];
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sourceUrl) {
      window.open(sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className={`
        inline-flex items-center 
        text-muted-foreground 
        bg-background/80 
        backdrop-blur-sm 
        rounded-md 
        border border-border/50
        ${sizeClass.container}
        ${sourceUrl ? 'cursor-pointer hover:bg-background/90 transition-colors' : ''}
        ${className}
      `}
      onClick={sourceUrl ? handleClick : undefined}
    >
      {/* Google Logo */}
      <img 
        src="/google-logo.svg" 
        alt="Google" 
        className={`${sizeClass.icon} opacity-70`}
      />
      
      {/* Attribution Text */}
      <span className="font-medium">
        {typeLabels[type]}
      </span>
      
      {/* External Link Icon (if sourceUrl provided) */}
      {sourceUrl && (
        <ExternalLink className={`${sizeClass.linkIcon} opacity-60`} />
      )}
    </div>
  );
}

// Overlay variant for photos
export function GoogleAttributionOverlay({ 
  type, 
  sourceUrl, 
  className = '' 
}: Omit<GoogleAttributionProps, 'size'>) {
  
  return (
    <div 
      className={`
        absolute bottom-2 right-2 z-10
        ${className}
      `}
    >
      <GoogleAttribution 
        type={type} 
        sourceUrl={sourceUrl} 
        size="sm"
        className="bg-black/70 text-white border-white/20 hover:bg-black/80"
      />
    </div>
  );
}

// Inline variant for ratings
export function GoogleAttributionInline({ 
  type, 
  sourceUrl, 
  className = '' 
}: Omit<GoogleAttributionProps, 'size'>) {
  return (
    <GoogleAttribution 
      type={type} 
      sourceUrl={sourceUrl} 
      size="sm"
      className={`inline-flex ${className}`}
    />
  );
}
