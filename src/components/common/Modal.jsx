import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { colors } from '../../constants/colors';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  // Close if clicking outside the modal content
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className={`${sizeClasses[size]} w-full bg-white rounded-xl shadow-lg overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 py-4 border-b border-beige flex justify-between items-center">
            <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
            <button 
              className="text-darkBrown hover:text-charcoal p-1 rounded-full hover:bg-gray-100"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;