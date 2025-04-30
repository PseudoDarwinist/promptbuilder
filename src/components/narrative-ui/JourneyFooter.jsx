import React from 'react';
import { useJourneyStore } from '../../hooks/useJourneyStore';
import { colors } from '../../constants/colors';

// Helper function to sanitize filenames
const sanitizeFilename = (name) => {
  // Replace invalid characters with underscores
  return name.replace(/[\\/:*?"<>|\\s]+/g, '_') || 'journey';
};

const JourneyFooter = ({ onOpenShareModal }) => {
  const { currentStepIndex, steps, currentStep, currentJourney } = useJourneyStore();
  const progress = steps.length > 1 
    ? Math.round((currentStepIndex / (steps.length - 1)) * 100) 
    : steps.length === 1 ? 100 : 0;
  
  const handleExport = (format = 'md') => {
    if (!currentJourney || !steps || steps.length === 0) {
      console.warn('[Export] No journey or steps available to export.');
      return; // Or show a message to the user
    }

    let content = '';
    let filename = sanitizeFilename(currentJourney.name);
    let mimeType = '';

    if (format === 'md') {
      filename += '.md';
      mimeType = 'text/markdown';
      content = `# ${currentJourney.name}\n\n`; // Add Journey title
      steps.forEach((step, index) => {
        content += `## ${index + 1}. ${step.title || 'Untitled Step'}\n\n`;
        if (step.description) {
          content += `${step.description}\n\n`;
        }
        if (step.prompt?.content) {
          // Use correct Markdown code block formatting
          content += `\\\`\\\`\\\`\n${step.prompt.content}\n\\\`\\\`\\\`\n\n`;
        } else {
          content += '*No prompt content for this step.*\n\n';
        }
      });
    } else if (format === 'json') {
      // Add JSON export logic later
      console.log('JSON export not yet implemented');
      return; 
    }

    // Create a Blob and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`[Export] Triggered download for ${filename}`);
  };
  
  return (
    <footer 
      className="px-8 py-6 flex justify-between items-center text-sm bg-white dark:bg-gray-800 border-t border-beige dark:border-gray-700 text-darkBrown dark:text-gray-300"
    >
      <div className="flex items-center">
        <div 
          className="w-2 h-2 rounded-full mr-2" 
          style={{ backgroundColor: currentStep?.color || colors.terracotta }}
        ></div>
        <span className="font-medium">Journey Progress:</span> {progress}%
      </div>
      <div className="flex space-x-6">
        <button className="hover:underline disabled:opacity-50" disabled>Save Journey</button>
        <button 
          className="hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onOpenShareModal}
          disabled={!currentJourney}
        >
          Share Journey
        </button>
        <button 
          className="hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleExport('md')}
          disabled={!currentJourney || steps.length === 0}
        >
          Export Prompts
        </button>
      </div>
    </footer>
  );
};

export default JourneyFooter;