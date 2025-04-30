import React from 'react';
import JourneyHeader from './JourneyHeader';
import JourneyFooter from './JourneyFooter';

const NarrativeLayout = ({ children, onOpenShareModal }) => {
  return (
    <div className="min-h-screen flex flex-col bg-offWhite dark:bg-gray-900 text-charcoal dark:text-gray-100 transition-colors duration-200">
      <JourneyHeader />
      <main className="flex-1 overflow-auto px-8 py-6">
        {children}
      </main>
      <JourneyFooter onOpenShareModal={onOpenShareModal} />
    </div>
  );
};

export default NarrativeLayout;