import React, { useEffect } from 'react';
import AppRoutes from './routes';
import { runMigrations } from './db/database';
import './index.css';

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
  
  return <AppRoutes />;
}

export default App;