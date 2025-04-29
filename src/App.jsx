import React, { useEffect } from 'react';
import AppRoutes from './routes';
import { runMigrations } from './db/database';
import './index.css';
import { useThemeStore } from './hooks/useThemeStore';

function App() {
  useEffect(() => {
    // Initialize database when app starts
    const initDb = async () => {
      try {
        await runMigrations();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    
    initDb();
  }, []);

  // Initialize theme on component mount
  useEffect(() => {
    const cleanup = useThemeStore.getState().initializeTheme();
    return cleanup; // Return cleanup function for when component unmounts
  }, []);
  
  return <AppRoutes />;
}

export default App;