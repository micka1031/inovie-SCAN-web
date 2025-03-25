import React from 'react';

interface MarkerIconProps {
  order: number;
  color: string;
  size?: number;
}

const MarkerIcon: React.FC<MarkerIconProps> = ({ order, color, size = 30 }) => {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: `${Math.floor(size / 2)}px`,
        border: '2px solid white',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)'
      }}
    >
      {order}
    </div>
  );
};

export default MarkerIcon; 