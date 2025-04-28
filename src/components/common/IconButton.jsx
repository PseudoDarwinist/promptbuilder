import React from 'react';
import classNames from 'classnames';

const IconButton = ({ 
  icon, 
  color, 
  onClick, 
  disabled = false,
  className,
  ...props 
}) => {
  const buttonClasses = classNames(
    'w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200',
    {
      'opacity-50 cursor-not-allowed': disabled,
      'hover:bg-black hover:bg-opacity-5': !disabled
    },
    className
  );
  
  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      style={{ color }}
      {...props}
    >
      {icon}
    </button>
  );
};

export default IconButton;