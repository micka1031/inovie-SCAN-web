import React from 'react';
import { useResponsiveScale } from '../hooks/useResponsiveScale';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({ 
  children, 
  className = '' 
}) => {
  const { scale, fontSize } = useResponsiveScale();

  return (
    <div 
      className={`responsive-wrapper ${className}`}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        fontSize: `${fontSize}`,
        width: '100%',
        height: '100%'
      }}
    >
      {children}
    </div>
  );
}; 
