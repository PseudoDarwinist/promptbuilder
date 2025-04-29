import React, { useEffect } from 'react';
import { useJourneyStore } from '../../hooks/useJourneyStore';
import { colors } from '../../constants/colors';
import * as LucideIcons from 'lucide-react';

const JourneyTimeline = () => {
  const { steps, currentStepIndex, goToStep } = useJourneyStore();
  
  // Effect to ensure there's a selected step if steps exist
  useEffect(() => {
    // If we have steps but no currentStep is selected (or invalid index), select the first one
    if (steps.length > 0 && (currentStepIndex < 0 || currentStepIndex >= steps.length)) {
      console.log("Timeline detected invalid currentStepIndex, resetting to 0");
      goToStep(0);
    }
  }, [steps, currentStepIndex, goToStep]);
  
  // Dynamic icon rendering from string name
  const renderIcon = (iconName) => {
    const Icon = LucideIcons[iconName] || LucideIcons.Circle;
    return <Icon size={24} />;
  };
  
  // If no steps, don't render the timeline
  if (steps.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-10 relative px-12">
      {/* Journey path line */}
      <div className="absolute left-0 right-0 h-0.5 top-12 -z-10" 
           style={{ backgroundColor: colors.beige }}></div>
      
      {/* Journey nodes */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          // Calculate if this stage is active, completed, or upcoming
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center">
              {/* Node */}
              <button
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 mb-3 ${
                  isActive ? 'shadow-lg' : isCompleted ? 'opacity-90' : 'opacity-60'
                }`}
                style={{ 
                  backgroundColor: isActive || isCompleted ? step.color : colors.beige,
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  border: isActive ? `4px solid ${colors.offWhite}` : 'none'
                }}
                onClick={() => {
                  console.log(`Timeline: clicking on step at index ${index}, step:`, step.title);
                  
                  // First set currentStepIndex directly in the store
                  useJourneyStore.setState({ currentStepIndex: index });
                  
                  // Then call goToStep as a backup
                  goToStep(index);
                }}
                aria-label={`Go to ${step.title} stage`}
              >
                <div className="text-white">
                  {renderIcon(step.icon)}
                </div>
              </button>
              
              {/* Stage label */}
              <div className={`text-center transition-all duration-300 ${
                isActive ? 'opacity-100' : 'opacity-70'
              }`}>
                <div className="text-sm font-medium" 
                     style={{ color: isActive ? step.color : colors.charcoal }}>
                  {step.title}
                </div>
                <div className="text-xs mt-1 max-w-28" style={{ color: colors.darkBrown }}>
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JourneyTimeline;