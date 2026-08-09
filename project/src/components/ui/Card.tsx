import { type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  children: ReactNode;
  hover?: boolean;
  className?: string;
}

export function Card({ children, hover = false, className = '', ...props }: CardProps) {
  return (
    <motion.div
      className={`bg-bg-card border border-border rounded-xl shadow-soft ${hover ? 'transition-all duration-200 hover:border-border-strong hover:shadow-elevated' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
