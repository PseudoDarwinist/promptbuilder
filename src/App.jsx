import React, { useEffect, useState } from 'react';
import AppRoutes from './routes';
import './index.css';
import { useThemeStore } from './hooks/useThemeStore';
import dbService from './api/db/database-service';

function App() {
  const [dbStatus, setDbStatus] = useState({ initialized: false, error: null });

  // Initialize database
  useEffect(() => {
    const initDb = async () => {
      try {
        console.log('Initializing database from App component...');
        const result = await dbService.initializeDatabase();
        console.log('Database initialization result:', result);
        
        setDbStatus({ 
          initialized: result.success, 
          error: result.success ? null : result.error,
          resetPerformed: result.resetPerformed || false 
        });
        
        if (result.success) {
          console.log('Database initialized successfully');
        } else {
          console.error('Database initialization failed:', result.error);
        }
      } catch (error) {
        console.error('Error during database initialization:', error);
        setDbStatus({ initialized: false, error: error.message });
      }
    };
    
    initDb();
  }, []);

  // Initialize theme on component mount
  useEffect(() => {
    const cleanup = useThemeStore.getState().initializeTheme();
    return cleanup; // Return cleanup function for when component unmounts
  }, []);
  
  // Show a loading indicator while the database is initializing
  if (!dbStatus.initialized && !dbStatus.error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Initializing application...</p>
        </div>
      </div>
    );
  }
  
  // Show an error message if database initialization failed
  if (dbStatus.error) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-50">
        <div className="text-center max-w-md p-6 bg-white shadow-lg rounded-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-red-700 mb-2">Database Error</h1>
          <p className="text-gray-700 mb-4">{dbStatus.error}</p>
          <p className="text-sm text-gray-500 mb-4">
            Try refreshing the page or clearing your browser's data for this site.
          </p>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  return <AppRoutes />;
}

export default App;