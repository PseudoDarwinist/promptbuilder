import React, { useEffect } from 'react';
import AppRoutes from './routes';
// import { runMigrations } from './db/database'; // REMOVED old SQL migration import
import './index.css';
import { useThemeStore } from './hooks/useThemeStore';

function App() {
  // REMOVED useEffect hook that called runMigrations
  // useEffect(() => {
  //   const initDb = async () => {
  //     try {
  //       await runMigrations();
  //       console.log(\'Database initialized successfully\');
  //     } catch (error) {
  //       console.error(\'Failed to initialize database:\', error);
  //     }
  //   };
  //   initDb();
  // }, []);

  // Initialize theme on component mount
  useEffect(() => {
    const cleanup = useThemeStore.getState().initializeTheme();
    return cleanup; // Return cleanup function for when component unmounts
  }, []);
  
  // The database will now be initialized purely by the openDB call 
  // in database-service.js when it\'s first imported/used.
  return <AppRoutes />;
}

export default App;