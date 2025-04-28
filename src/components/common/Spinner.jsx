import React from 'react';

const Spinner = ({ size = 'md', color = '#E07A5F' }) => {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3'
  };
  
  const spinnerSize = sizeMap[size] || sizeMap.md;
  
  return (
    <div 
      className={`animate-spin ${spinnerSize} border-t-transparent rounded-full`}
      style={{ borderColor: `${color} transparent ${color} ${color}` }}
    ></div>
  );
};

export default Spinner;