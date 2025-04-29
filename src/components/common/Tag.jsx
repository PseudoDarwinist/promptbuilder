import React from 'react';
import { colors } from '../../constants/colors';

const Tag = ({ label, onRemove, className = '' }) => {
  return (
    <span 
      className={`px-2 py-1 text-darkBrown text-xs rounded-full inline-flex items-center ${className}`}
      style={{ backgroundColor: colors.offWhite }}
    >
      {label}
      {onRemove && (
        <button 
          onClick={onRemove} 
          className="ml-1 text-darkBrown opacity-70 hover:opacity-100"
          aria-label={`Remove ${label} tag`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </span>
  );
};

export default Tag;