import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import JourneysListPage from '../pages/JourneysListPage';
import NarrativeJourneyPage from '../pages/NarrativeJourneyPage';
import SharedJourneyPage from '../pages/SharedJourneyPage';

const AppRoutes = () => {
  return (
      <Routes>
        <Route path="/" element={<JourneysListPage />} />
        <Route path="/journey/:journeyId" element={<NarrativeJourneyPage />} />
        <Route path="/share/:shareId" element={<SharedJourneyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};

export default AppRoutes;