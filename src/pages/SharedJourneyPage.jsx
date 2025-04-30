import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJourneyStore } from '../hooks/useJourneyStore';
import Spinner from '../components/common/Spinner';
import Button from '../components/common/Button';
import { AlertTriangle, Copy } from 'lucide-react';
import { colors } from '../constants/colors';

// Minimal Header for Shared Page
const SharedHeader = ({ journeyName }) => (
  <header className="p-4 border-b border-beige dark:border-gray-700 bg-white dark:bg-gray-800">
    <h1 className="text-lg font-semibold text-charcoal dark:text-gray-100">
      {journeyName || 'Shared Journey'}
    </h1>
  </header>
);

// Minimal Footer for Shared Page
const SharedFooter = () => (
  <footer className="p-4 text-center text-xs text-darkBrown dark:text-gray-400 border-t border-beige dark:border-gray-700 bg-white dark:bg-gray-800">
    <p>Powered by PromptFlow</p>
  </footer>
);

// Content Display Component (Simplified StageContent)
const SharedStepContent = ({ step }) => {
  const [copyStatus, setCopyStatus] = useState('Copy');

  const handleCopy = async () => {
    if (!step?.prompt?.content) return;
    try {
      await navigator.clipboard.writeText(step.prompt.content);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      setCopyStatus('Failed');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    }
  };

  if (!step) return null;

  return (
    <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1" style={{ color: step.color || colors.charcoal }}>
            {step.title}
          </h3>
          <p className="text-sm text-darkBrown dark:text-gray-300">{step.description}</p>
        </div>
        {step.prompt?.content && (
          <Button
            icon={<Copy size={16} />}
            onClick={handleCopy}
            disabled={copyStatus !== 'Copy'}
            // Use a neutral style
            variant="secondary"
          >
            {copyStatus}
          </Button>
        )}
      </div>

      {step.prompt?.content ? (
        <div
          className="p-4 rounded-md font-mono text-sm whitespace-pre-line bg-gray-50 dark:bg-gray-700"
          style={{ borderLeft: `3px solid ${step.color || colors.beige}` }}
        >
          {step.prompt.content}
        </div>
      ) : (
        <p className="text-sm text-darkBrown dark:text-gray-400 italic">(No prompt content for this step)</p>
      )}

      {/* Optionally display tags or other details if needed */}
    </div>
  );
};

const SharedJourneyPage = () => {
  const { shareId } = useParams();
  const { loadSharedJourney, loading, error } = useJourneyStore();
  const [journeyData, setJourneyData] = useState(null);

  useEffect(() => {
    const fetchSharedData = async () => {
      if (shareId) {
        const data = await loadSharedJourney(shareId);
        setJourneyData(data);
      }
    };
    fetchSharedData();
  }, [shareId, loadSharedJourney]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-offWhite dark:bg-gray-900">
        <SharedHeader journeyName="Loading Journey..." />
        <main className="flex-1 flex items-center justify-center">
          <Spinner />
        </main>
        <SharedFooter />
      </div>
    );
  }

  if (error || !journeyData) {
    return (
      <div className="min-h-screen flex flex-col bg-offWhite dark:bg-gray-900">
        <SharedHeader journeyName="Error" />
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2 text-charcoal dark:text-gray-100">Cannot Load Journey</h2>
          <p className="text-darkBrown dark:text-gray-300 mb-6 text-center">
            {error || "This shared journey could not be found or is no longer available."}
          </p>
          <Link to="/">
            <Button variant="primary">Go to Homepage</Button>
          </Link>
        </main>
        <SharedFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-offWhite dark:bg-gray-900">
      <SharedHeader journeyName={journeyData.name} />
      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-darkBrown dark:text-gray-400 mb-6">{journeyData.description}</p>

          {journeyData.steps && journeyData.steps.length > 0 ? (
            journeyData.steps.map((step, index) => (
              <SharedStepContent key={step.id || index} step={step} />
            ))
          ) : (
            <p className="text-center text-darkBrown dark:text-gray-300">This journey doesn't have any steps yet.</p>
          )}
        </div>
      </main>
      <SharedFooter />
    </div>
  );
};

export default SharedJourneyPage; 