import { Compass } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 18, text: 'text-sm' },
  md: { icon: 22, text: 'text-base' },
  lg: { icon: 28, text: 'text-lg' },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary-500/30 blur-md rounded-full" />
        <Compass size={s.icon} className="relative text-primary-400" strokeWidth={2} />
      </div>
      {showText && (
        <span className={`font-semibold text-white tracking-tight ${s.text}`}>
          Code<span className="text-primary-400">Compass</span>
        </span>
      )}
    </div>
  );
}
