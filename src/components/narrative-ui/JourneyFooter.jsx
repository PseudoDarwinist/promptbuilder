import React from 'react';
import { useJourneyStore } from '../../hooks/useJourneyStore';
import { colors } from '../../constants/colors';

const JourneyFooter = () => {
  const { currentStepIndex, steps, currentStep } = useJourneyStore();
  const progress = steps.length > 1 
    ? Math.round((currentStepIndex / (steps.length - 1)) * 100) 
    : steps.length === 1 ? 100 : 0;
  
  return (
    <footer 
      className="px-8 py-6 flex justify-between items-center text-sm" 
      style={{ borderTop: `1px solid ${colors.beige}`, color: colors.darkBrown }}
    >
      <div className="flex items-center">
        <div 
          className="w-2 h-2 rounded-full mr-2" 
          style={{ backgroundColor: currentStep?.color || colors.terracotta }}
        ></div>
        <span className="font-medium">Journey Progress:</span> {progress}%
      </div>
      <div className="flex space-x-6">
        <button className="hover:underline">Save Journey</button>
        <button className="hover:underline">Share Journey</button>
        <button className="hover:underline">Export Prompts</button>
      </div>
    </footer>
  );
};

export default JourneyFooter;