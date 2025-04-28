import React from 'react';
import JourneyHeader from './JourneyHeader';
import JourneyFooter from './JourneyFooter';
import { colors } from '../../constants/colors';

const NarrativeLayout = ({ children }) => {
  return (
    <div className="h-screen flex flex-col bg-offWhite text-charcoal">
      <JourneyHeader />
      <main className="flex-1 overflow-auto px-8 py-6">
        {children}
      </main>
      <JourneyFooter />
    </div>
  );
};

export default NarrativeLayout;