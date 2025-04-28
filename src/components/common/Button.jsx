import React from 'react';
import classNames from 'classnames';

const Button = ({ 
  children, 
  variant = 'primary', 
  color, 
  onClick, 
  disabled = false,
  className,
  icon,
  ...props 
}) => {
  const baseStyles = 'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200';
  
  const variantStyles = {
    primary: 'text-white',
    secondary: 'border border-beige text-darkBrown hover:bg-black hover:bg-opacity-5',
    text: 'hover:bg-black hover:bg-opacity-5 text-darkBrown',
    icon: 'p-2 rounded-full hover:bg-black hover:bg-opacity-5'
  };
  
  const buttonClasses = classNames(
    baseStyles,
    variantStyles[variant],
    {
      'opacity-50 cursor-not-allowed': disabled,
      'flex items-center': Boolean(icon)
    },
    className
  );
  
  const buttonStyle = variant === 'primary' && color ? { backgroundColor: color } : {};
  
  return (
    <button
      className={buttonClasses}
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className={children ? 'mr-1.5' : ''}>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;