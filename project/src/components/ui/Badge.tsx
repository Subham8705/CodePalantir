import { type ReactNode } from 'react';

type Variant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'accent';

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-bg-hover text-gray-400 border-border',
  primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  secondary: 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20',
  success: 'bg-success-500/10 text-success-400 border-success-500/20',
  warning: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  error: 'bg-error-500/10 text-error-400 border-error-500/20',
  accent: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
