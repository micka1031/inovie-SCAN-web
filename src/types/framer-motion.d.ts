declare module 'framer-motion' {
  import * as React from 'react';

  export interface MotionProps {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    variants?: any;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
  }

  export interface AnimatePresenceProps {
    children?: React.ReactNode;
    exitBeforeEnter?: boolean;
    initial?: boolean;
    onExitComplete?: () => void;
  }

  export const motion: {
    [key: string]: React.ForwardRefExoticComponent<MotionProps>;
  };

  export const AnimatePresence: React.FC<AnimatePresenceProps>;
} 