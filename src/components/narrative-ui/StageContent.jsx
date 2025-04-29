import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Edit, AlertCircle } from 'lucide-react';
import { useJourneyStore } from '../../hooks/useJourneyStore';
import { colors } from '../../constants/colors';
import Button from '../common/Button';
import Tag from '../common/Tag';
import { format } from 'date-fns';

const StageContent = () => {
  // Select primitive state values directly
  const steps = useJourneyStore(state => state.steps);
  const currentStepIndex = useJourneyStore(state => state.currentStepIndex);
  const showPromptDetails = useJourneyStore(state => state.showPromptDetails);
  
  // Select actions directly (references are stable)
  const togglePromptDetails = useJourneyStore(state => state.togglePromptDetails);
  const nextStep = useJourneyStore(state => state.nextStep);
  const prevStep = useJourneyStore(state => state.prevStep);
  const updateStep = useJourneyStore(state => state.updateStep);
  
  // Derive currentStep inside the component using useMemo
  const currentStep = React.useMemo(() => {
    if (currentStepIndex >= 0 && currentStepIndex < steps.length) {
      console.log(`[StageContent Derived] Calculating step for index ${currentStepIndex}`);
      return steps[currentStepIndex];
    }
    console.log(`[StageContent Derived] Invalid index (${currentStepIndex}) or steps length (${steps.length}). Returning null.`);
    return null;
  }, [steps, currentStepIndex]);
  
  // Log values received from the hook/derived at the start of render
  console.log(`[StageContent Render] steps.length=${steps.length}, currentStepIndex=${currentStepIndex}`);
  console.log(`[StageContent Render] Derived currentStep object: ${currentStep ? currentStep.title : 'null'}`);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  // Update the edited content when the current step changes
  useEffect(() => {
    if (currentStep?.prompt?.content) {
      setEditedContent(currentStep.prompt.content);
    } else if (currentStep) {
      // Initialize with empty string if we have a step but no prompt content
      setEditedContent('');
    }
    // Reset editing state when step changes
    setIsEditing(false);
  }, [currentStep]); // Depend only on the derived step object
  
  // Debugging the current step and its prompt
  useEffect(() => {
    if (currentStep) {
      console.log('Current step:', JSON.stringify(currentStep, null, 2));
      console.log('Has prompt?', !!currentStep.prompt);
      console.log('Prompt content?', currentStep.prompt?.content);
      
      // More detailed logging of the prompt structure
      if (currentStep.prompt) {
        console.log('Prompt structure:', JSON.stringify(currentStep.prompt, null, 2));
      } else {
        console.log('No prompt data is present on the currentStep object');
      }
      
      // Log the steps array for comparison
      console.log('All steps:', steps.length);
      console.log('Current step index:', currentStepIndex);
    } else {
      console.log('No current step available');
      console.log('Steps array length:', steps.length);
    }
  }, [currentStep, steps, currentStepIndex]);

  // Check loading state based ONLY on presence of steps and valid index
  if (steps.length > 0 && currentStepIndex === -1) {
     console.log("[StageContent Render] Steps loaded, but index is -1. Waiting for index update.");
     return (
      <div className="rounded-xl p-8 bg-white shadow-card text-center">
        <p className="text-darkBrown">Selecting step...</p>
      </div>
    );
  }

  // Render loading state if steps exist but the derived currentStep is null (index issue)
  if (steps.length > 0 && !currentStep) {
    console.error("[StageContent Render] Condition met: steps.length > 0 BUT derived currentStep is null. Index likely invalid? Displaying loading..."); 
    return (
      <div className="rounded-xl p-8 bg-white shadow-card text-center">
        <p className="text-darkBrown">Loading step content...</p>
        <p className="text-sm text-darkBrown mt-2">If content doesn't load automatically, try clicking on the step again.</p>
      </div>
    );
  }

  // If there are no steps, then truly nothing is selected
  if (steps.length === 0) {
    console.log("[StageContent Render] Condition met: No steps array. Displaying 'No steps available'.");
    return (
      <div className="rounded-xl p-8 bg-white shadow-card">
        <p className="text-center text-darkBrown">No steps available. Create a step to get started.</p>
      </div>
    );
  }
  
  // Log before returning the main content
  console.log(`[StageContent Render] Proceeding to render main content for step: ${currentStep ? currentStep.title : 'ERROR - Should have currentStep here'}`);

  // If the step exists but doesn't have a prompt (or empty content)
  // Note: loadSteps now initializes prompt, so currentStep.prompt should exist
  const hasStepButNoPrompt = currentStep && (!currentStep.prompt || !currentStep.prompt.content);
  
  const handleSave = async () => {
    try {
      const promptData = currentStep.prompt 
        ? { ...currentStep.prompt, content: editedContent }
        : { content: editedContent, tags: [] };
      
      console.log('Saving prompt data:', promptData);
      
      await updateStep(currentStep.id, {
        ...currentStep,
        prompt: promptData
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt: ' + error.message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset the content to the current step's prompt content
    if (currentStep?.prompt?.content) {
      setEditedContent(currentStep.prompt.content);
    }
  };

  return (
    <div className="rounded-xl p-8 transition-all duration-300"
      style={{ 
        backgroundColor: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold" style={{ color: currentStep.color }}>
            {currentStep.title}
          </h3>
          <p className="mt-1" style={{ color: colors.darkBrown }}>
            {currentStep.description}
          </p>
        </div>
        
        <div className="flex space-x-3">
          {!isEditing && (
            <>
              <Button 
                variant="secondary"
                onClick={togglePromptDetails}
              >
                {showPromptDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              <Button 
                variant="primary"
                icon={<Sparkles size={16} />}
                style={{ backgroundColor: currentStep.color }}
              >
                Cast Spell
              </Button>
            </>
          )}
          
          {isEditing && (
            <>
              <Button 
                variant="secondary"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                onClick={handleSave}
                style={{ backgroundColor: colors.sage }}
              >
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Conditional Rendering for No Prompt Content */} 
      {hasStepButNoPrompt && !isEditing && (
        <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-beige bg-opacity-10 mb-6">
          <AlertCircle size={40} className="text-amber-500 mb-4" />
          <p className="text-center text-darkBrown mb-4">No prompt content available for this step.</p>
          <Button 
            variant="primary" 
            icon={<Edit size={16} />}
            onClick={() => {
              setEditedContent('');
              setIsEditing(true);
            }}
            style={{ backgroundColor: currentStep.color }}
          >
            Add Prompt Content
          </Button>
        </div>
      )}

      {/* Prompt Content / Editing Area */} 
      {showPromptDetails && !isEditing && !hasStepButNoPrompt && (
        <div 
          className="rounded-lg p-6 font-mono text-sm whitespace-pre-line transition-all duration-300 mb-6"
          style={{ 
            backgroundColor: currentStep.color + '10',
            borderLeft: `4px solid ${currentStep.color}`
          }}
        >
          {currentStep.prompt.content}
        </div>
      )}

      {isEditing && (
        <div className="transition-all duration-300 mb-6">
          <textarea
            className="w-full h-64 p-4 rounded-lg font-mono text-sm border focus:ring-2 focus:outline-none"
            style={{ 
              borderColor: colors.beige,
              backgroundColor: currentStep.color + '05',
              focusRingColor: currentStep.color 
            }}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Enter your prompt content here..."
          />
        </div>
      )}
      
      {/* Tags and metadata - Render only if not editing and details are shown */}
      {showPromptDetails && !isEditing && (
        <>
          {currentStep.prompt?.tags && currentStep.prompt.tags.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-charcoal">Tags</h4>
                {/* Add edit functionality later if needed */}
              </div>
              <div className="flex flex-wrap gap-2">
                {currentStep.prompt.tags.map(tag => (
                  <Tag key={tag.id || tag.name} label={tag.name} /> // Use name as fallback key
                ))}
              </div>
            </div>
          )}
          
          {currentStep.prompt && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-charcoal">History</h4>
                {/* Add history view later */}
              </div>
              <div className="text-xs text-darkBrown">
                {currentStep.prompt.last_used && (
                  <span>Last used {format(new Date(currentStep.prompt.last_used), 'MMM d, yyyy')}</span>
                )}
                {currentStep.prompt.updated_at && (
                  <span> • Modified {format(new Date(currentStep.prompt.updated_at), 'MMM d, yyyy')}</span>
                )}
                {!currentStep.prompt.last_used && !currentStep.prompt.updated_at && (
                  <span>Prompt exists but hasn't been used or modified recently.</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Edit Button - Show only if not editing and details are shown */} 
      {showPromptDetails && !isEditing && (
        <div className="mt-6 text-right">
          <Button 
            variant="secondary"
            onClick={() => {
              setEditedContent(currentStep.prompt?.content || '');
              setIsEditing(true);
            }}
            icon={<Edit size={16} />}
          >
            {currentStep.prompt?.content ? 'Edit Prompt' : 'Add Prompt Content'}
          </Button>
        </div>
      )}
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-10">
        <Button
          variant="text"
          icon={<ChevronLeft size={16} />}
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className={currentStepIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}
        >
          Previous Chapter
        </Button>
        
        <Button
          variant="text"
          icon={<ChevronRight size={16} />}
          onClick={nextStep}
          disabled={currentStepIndex === steps.length - 1}
          className={currentStepIndex === steps.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}
        >
          Next Chapter
        </Button>
      </div>
    </div>
  );
};

export default StageContent;