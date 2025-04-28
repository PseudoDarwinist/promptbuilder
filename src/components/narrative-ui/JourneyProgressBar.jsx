import React from 'react';
import { useJourneyStore } from '../../hooks/useJourneyStore';

const JourneyProgressBar = () => {
  const { currentStepIndex, steps, currentStep } = useJourneyStore();
  const progressPercentage = steps.length ? ((currentStepIndex + 1) / steps.length) * 100 : 0;
  
  return (
    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className="h-full transition-all duration-500 ease-out"
        style={{ 
          width: `${progressPercentage}%`,
          backgroundColor: currentStep?.color || '#E07A5F' 
        }}
      ></div>
    </div>
  );
};

export default JourneyProgressBar;