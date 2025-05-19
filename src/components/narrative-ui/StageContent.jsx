import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Edit, AlertCircle, Clipboard, Paperclip, RefreshCw, Bug } from 'lucide-react';
import { useJourneyStore } from '../../hooks/useJourneyStore';
import { colors } from '../../constants/colors';
import Button from '../common/Button';
import Tag from '../common/Tag';
import AttachmentViewer from '../common/AttachmentViewer';
import FileUploader from '../common/FileUploader';

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
      return steps[currentStepIndex];
    }
    return null;
  }, [steps, currentStepIndex]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [copyStatus, setCopyStatus] = useState('Copy');
  const [isAddingAttachments, setIsAddingAttachments] = useState(false);
  const [attachmentsToAdd, setAttachmentsToAdd] = useState([]);
  
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
  
  // Check loading state based ONLY on presence of steps and valid index
  if (steps.length > 0 && currentStepIndex === -1) {
     return (
      <div className="rounded-xl p-8 bg-white shadow-card text-center">
        <p className="text-darkBrown">Selecting step...</p>
      </div>
    );
  }

  // Render loading state if steps exist but the derived currentStep is null (index issue)
  if (steps.length > 0 && !currentStep) {
    return (
      <div className="rounded-xl p-8 bg-white shadow-card text-center">
        <p className="text-darkBrown">Loading step content...</p>
        <p className="text-sm text-darkBrown mt-2">If content doesn't load automatically, try clicking on the step again.</p>
      </div>
    );
  }

  // If there are no steps, then truly nothing is selected
  if (steps.length === 0) {
    return (
      <div className="rounded-xl p-8 bg-white shadow-card">
        <p className="text-center text-darkBrown">No steps available. Create a step to get started.</p>
      </div>
    );
  }
  
  // If the step exists but doesn't have a prompt (or empty content)
  // Note: loadSteps now initializes prompt, so currentStep.prompt should exist
  const hasStepButNoPrompt = currentStep && (!currentStep.prompt || !currentStep.prompt.content);
  
  const handleSave = async () => {
    try {
      const promptData = currentStep.prompt 
        ? { ...currentStep.prompt, content: editedContent }
        : { content: editedContent, tags: [] };
      
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

  const handleCopy = async () => {
    if (!currentStep?.prompt?.content) return;

    try {
      await navigator.clipboard.writeText(currentStep.prompt.content);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    } catch (err) {
      console.error('[StageContent] Failed to copy prompt:', err);
      setCopyStatus('Failed');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    }
  };

  // Handle attachment download
  const handleAttachmentDownload = async (attachment) => {
    try {
      // Call the API endpoint to download the attachment
      const response = await fetch(`/api/steps/attachments/${attachment.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to download attachment');
      }
      
      // Create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download attachment');
    }
  };
  
  // Handle attachment deletion
  const handleAttachmentDelete = async (attachment) => {
    try {
      if (!attachment || !attachment.id) {
        throw new Error('Invalid attachment');
      }
      
      // Import stepService
      const { stepService } = await import('../../api/services/stepService');
      
      // Call delete endpoint
      await stepService.deleteAttachment(attachment.id);
      
      // Update the UI by removing the deleted attachment
      if (currentStep && currentStep.prompt && currentStep.prompt.attachments) {
        // Create a new attachments array without the deleted attachment
        const updatedAttachments = currentStep.prompt.attachments.filter(a => a.id !== attachment.id);
        
        // Update the step in the store
        const updatedSteps = [...steps];
        const updatedStep = {
          ...currentStep,
          prompt: {
            ...currentStep.prompt,
            attachments: updatedAttachments
          }
        };
        
        updatedSteps[currentStepIndex] = updatedStep;
        useJourneyStore.setState({ steps: updatedSteps });
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment: ' + error.message);
    }
  };

  const handleAddAttachments = async () => {
    if (attachmentsToAdd.length === 0) {
      setIsAddingAttachments(false);
      return;
    }

    try {
      // Make sure we have a valid step and prompt
      if (!currentStep || !currentStep.id) {
        throw new Error('Invalid step: Cannot add attachments to undefined step');
      }
      
      // Ensure file data is correctly formatted (base64)
      const processedAttachments = await Promise.all(attachmentsToAdd.map(async (attachment) => {
        // If file_data is not a string (e.g., it's a File object), convert it
        if (attachment.file && !attachment.file_data) {
          return {
            ...attachment,
            file_data: await readFileAsDataURL(attachment.file)
          };
        }
        return attachment;
      }));
      
      // Import the step service
      const { stepService } = await import('../../api/services/stepService');
      
      // Get existing attachments, or empty array if none
      const existingAttachments = currentStep.prompt?.attachments || [];
      
      // Check if prompt exists, if not we need to create it first
      const hasPrompt = currentStep.prompt && currentStep.prompt.id;
      
      let updatedStep;
      
      // Try direct attachment upload if we have a prompt
      if (hasPrompt && currentStep.prompt.id) {
        try {
          // Add each attachment directly using stepService
          for (const attachment of processedAttachments) {
            await stepService.addAttachment(currentStep.prompt.id, attachment);
          }
          
          // Reload the step to get updated attachments
          updatedStep = await stepService.getStepWithPrompt(currentStep.id);
        } catch (directError) {
          console.error('STAGE_CONTENT DEBUG: Direct attachment upload failed:', directError);
          // Fall back to regular update
          updatedStep = null; // Ensure fallback occurs
        }
      }
      
      // If direct upload failed or not possible, use regular update
      if (!updatedStep) {
        if (!hasPrompt) {
          // Create a minimal prompt first
          const newPromptData = {
            content: '',
            tags: [],
            attachments: processedAttachments
          };
          
          // Update the step with the new prompt
          updatedStep = await updateStep(currentStep.id, {
            ...currentStep,
            prompt: newPromptData
          });
        } else {
          // Create updated prompt data with existing prompt ID
          const promptData = {
            ...currentStep.prompt,
            attachments: [...existingAttachments, ...processedAttachments]
          };
          
          // Update the step with new attachments
          updatedStep = await updateStep(currentStep.id, {
            ...currentStep,
            prompt: promptData
          });
        }
      }
      
      // Force a refresh of the current step in the journey store
      if (updatedStep) {
        // Update the step in the store
        const updateStepsArray = [...steps];
        updateStepsArray[currentStepIndex] = updatedStep;
        
        // Set the updated steps array in the store
        useJourneyStore.setState({ steps: updateStepsArray });
      }
      
      setAttachmentsToAdd([]);
      setIsAddingAttachments(false);
    } catch (error) {
      console.error('Error adding attachments:', error);
      alert('Failed to add attachments: ' + error.message);
    }
  };
  
  // Helper function to read a file as data URL
  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const handleAttachmentsChange = (attachments) => {
    setAttachmentsToAdd(attachments);
  };
  
  const handleCancelAttachments = () => {
    setAttachmentsToAdd([]);
    setIsAddingAttachments(false);
  };

  return (
    <div className="rounded-xl p-8 transition-all duration-300 flex flex-col bg-white dark:bg-gray-800 shadow-card h-full"
      style={{
        // Removed boxShadow style - rely on Tailwind shadow-card
      }}
    >
      <div className="flex justify-between items-start mb-6 flex-shrink-0">
        <div>
          <h3 className="text-xl font-bold" style={{ color: currentStep.color }}>
            {currentStep.title}
          </h3>
          <p className="mt-1" style={{ color: colors.darkBrown }}>
            {currentStep.description}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {!isEditing && (
            <>
              <Button 
                icon={<Clipboard size={16} />}
                onClick={handleCopy}
                disabled={!currentStep?.prompt?.content || copyStatus !== 'Copy'}
                style={{
                  backgroundColor: '#B5D1AE',
                  color: colors.darkBrown,
                }}
              >
                {copyStatus}
              </Button>
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
      
      <div className="flex-1 overflow-y-auto pr-2 min-h-0">
        <div className="mb-6">
          {hasStepButNoPrompt && !isEditing && (
            <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-beige bg-opacity-10 dark:bg-gray-700 mb-6">
              <AlertCircle size={40} className="text-amber-500 mb-4" />
              <p className="text-center text-darkBrown dark:text-gray-300 mb-4">No prompt content available for this step.</p>
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

          {showPromptDetails && !isEditing && !hasStepButNoPrompt && (
            <div 
              className="rounded-lg p-6 font-mono text-sm whitespace-pre-line transition-all duration-300 mb-6 dark:text-gray-200 dark:bg-gray-700"
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
                className="w-full h-64 p-4 rounded-lg font-mono text-sm border focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
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
          
          {showPromptDetails && !isEditing && (
            <>
              {currentStep.prompt?.tags && currentStep.prompt.tags.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-charcoal dark:text-gray-300">Tags</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentStep.prompt.tags.map(tag => (
                      <Tag key={tag.id || tag.name} label={tag.name} />
                    ))}
                  </div>
                </div>
              )}
              
              {currentStep.prompt?.attachments && Array.isArray(currentStep.prompt.attachments) && (
                <>
                  {currentStep.prompt.attachments.length > 0 ? (
                    <AttachmentViewer 
                      attachments={currentStep.prompt.attachments} 
                      onDownload={handleAttachmentDownload}
                      onDelete={handleAttachmentDelete}
                    />
                  ) : (
                    <div className="mt-4 p-3 border border-amber-200 bg-amber-50 dark:bg-amber-900 dark:border-amber-700 rounded-lg">
                      <h4 className="text-sm font-medium text-charcoal dark:text-amber-100 mb-1">Attachments</h4>
                      <p className="text-xs text-darkBrown dark:text-amber-200">No attachments found for this prompt.</p>
                    </div>
                  )}
                </>
              )}
              
              {!isEditing && !isAddingAttachments && (
                <div className="mt-4 text-right">
                  <Button
                    variant="text"
                    onClick={() => setIsAddingAttachments(true)}
                    icon={<Paperclip size={16} />}
                    className="text-darkBrown dark:text-gray-300 hover:text-terracotta dark:hover:text-terracotta"
                  >
                    Add Attachments
                  </Button>
                </div>
              )}
              
              {isAddingAttachments && !isEditing && (
                <div className="mt-4 p-4 border border-beige dark:border-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-charcoal dark:text-gray-300 mb-2">Add Attachments</h4>
                  <FileUploader 
                    files={attachmentsToAdd}
                    onChange={handleAttachmentsChange}
                  />
                  <div className="flex justify-end space-x-3 mt-4">
                    <Button 
                      variant="secondary"
                      onClick={handleCancelAttachments}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary"
                      onClick={handleAddAttachments}
                      style={{ backgroundColor: colors.sage }}
                      disabled={attachmentsToAdd.length === 0}
                    >
                      Save Attachments
                    </Button>
                  </div>
                </div>
              )}
              

            </>
          )}
          
          {showPromptDetails && !isEditing && (
            <div className="mt-6 text-right">
              <Button 
                variant="secondary"
                onClick={() => {
                  setEditedContent(currentStep.prompt?.content || '');
                  setIsEditing(true);
                }}
                icon={<Edit size={16} />}
                className="dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                {currentStep.prompt?.content ? 'Edit Prompt' : 'Add Prompt Content'}
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between pt-4 border-t border-beige dark:border-gray-700 flex-shrink-0">
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