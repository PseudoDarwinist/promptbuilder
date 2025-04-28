import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useJourneyStore } from '../../hooks/useJourneyStore';
import JourneyHeader from './JourneyHeader';
import JourneyFooter from './JourneyFooter';
import Spinner from '../common/Spinner';
import { colors } from '../../constants/colors';

const NarrativeLayout = ({ children }) => {
  const { journeyId } = useParams();
  const { 
    loading, 
    currentJourney, 
    loadJourney 
  } = useJourneyStore();
  
  useEffect(() => {
    if (journeyId) {
      loadJourney(journeyId);
    }
  }, [journeyId, loadJourney]);
  
  if (loading && !currentJourney) {
    return (
      <div className="h-screen flex items-center justify-center bg-offWhite">
        <div className="text-center">
          <Spinner size="lg" color={colors.terracotta} />
          <p className="mt-4 text-darkBrown">Loading journey...</p>
        </div>
      </div>
    );
  }
  
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