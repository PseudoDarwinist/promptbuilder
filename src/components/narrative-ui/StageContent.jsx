import React, { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useJourneyStore } from '../../hooks/useJourneyStore';
import { colors } from '../../constants/colors';
import Button from '../common/Button';
import Tag from '../common/Tag';
import { format } from 'date-fns';

const StageContent = () => {
  const { 
    currentStep, 
    showPromptDetails, 
    togglePromptDetails, 
    nextStep, 
    prevStep, 
    currentStepIndex, 
    steps,
    updateStep
  } = useJourneyStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  if (!currentStep || !currentStep.prompt) {
    return (
      <div className="rounded-xl p-8 bg-white shadow-card">
        <p className="text-center text-darkBrown">No prompt data available for this step.</p>
      </div>
    );
  }

  const handleEdit = () => {
    setEditedContent(currentStep.prompt.content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateStep(currentStep.id, {
      ...currentStep,
      prompt: {
        ...currentStep.prompt,
        content: editedContent
      }
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl p-8 transition-all duration-300"
      style={{ 
        backgroundColor: showPromptDetails ? 'white' : currentStep.color + '20',
        boxShadow: showPromptDetails ? '0 4px 20px rgba(0,0,0,0.05)' : 'none',
        transform: showPromptDetails ? 'translateY(0)' : 'translateY(10px)'
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
      
      {showPromptDetails && !isEditing && (
        <div 
          className="rounded-lg p-6 font-mono text-sm whitespace-pre-line transition-all duration-300"
          style={{ 
            backgroundColor: currentStep.color + '10',
            borderLeft: `4px solid ${currentStep.color}`
          }}
        >
          {currentStep.prompt.content}
        </div>
      )}

      {showPromptDetails && isEditing && (
        <div className="transition-all duration-300">
          <textarea
            className="w-full h-64 p-4 rounded-lg font-mono text-sm border focus:ring-2 focus:outline-none"
            style={{ 
              borderColor: colors.beige,
              backgroundColor: currentStep.color + '05',
              focusRingColor: currentStep.color 
            }}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
        </div>
      )}
      
      {/* Tags and metadata */}
      {showPromptDetails && !isEditing && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-charcoal">Tags</h4>
            <button className="text-xs text-sage hover:underline">Edit</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentStep.prompt.tags && currentStep.prompt.tags.map(tag => (
              <Tag key={tag.id} label={tag.name} />
            ))}
            {(!currentStep.prompt.tags || currentStep.prompt.tags.length === 0) && (
              <span className="text-xs text-darkBrown">No tags added yet</span>
            )}
          </div>
        </div>
      )}
      
      {showPromptDetails && !isEditing && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-charcoal">History</h4>
            <button className="text-xs text-sage hover:underline">View All</button>
          </div>
          <div className="text-xs text-darkBrown">
            {currentStep.prompt.last_used && (
              <span>Last used {format(new Date(currentStep.prompt.last_used), 'MMM d, yyyy')}</span>
            )}
            {currentStep.prompt.updated_at && (
              <span> • Modified {format(new Date(currentStep.prompt.updated_at), 'MMM d, yyyy')}</span>
            )}
            {!currentStep.prompt.last_used && !currentStep.prompt.updated_at && (
              <span>Never used</span>
            )}
          </div>
        </div>
      )}
      
      {showPromptDetails && !isEditing && (
        <div className="mt-6 text-right">
          <Button 
            variant="secondary"
            onClick={handleEdit}
          >
            Edit Prompt
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
          className={`${currentStepIndex === steps.length - 1 ? 'opacity-50 cursor-not-allowed' : ''} flex-row-reverse`}
        >
          Next Chapter
        </Button>
      </div>
    </div>
  );
};

export default StageContent;