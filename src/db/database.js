import dbService from '../api/db/database-service';

// No actual migrations are needed with our IndexedDB implementation
// This is just to maintain API compatibility
export async function runMigrations() {
  console.log('Running migrations...');
  
  // Create the migrations table (just for API compatibility)
  await dbService.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // The actual migrations are handled in the database-service.js file
  // during the IndexedDB initialization
  
  // Add some test data if the database is empty
  const journeys = await dbService.all('SELECT * FROM journeys ORDER BY created_at DESC');
  if (journeys.length === 0) {
    console.log('Adding sample data...');
    
    // Add a sample journey
    const journeyResult = await dbService.run(
      'INSERT INTO journeys (name, description, icon) VALUES (?, ?, ?)',
      ['Getting Started', 'Learn how to use the app', 'BookOpen']
    );
    
    // Add some steps
    await dbService.run(
      'INSERT INTO steps (journey_id, step_id, title, description, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [journeyResult.lastID, 'intro', 'Introduction', 'Welcome to the app', 'Info', '#4CAF50', 0]
    );
    
    await dbService.run(
      'INSERT INTO steps (journey_id, step_id, title, description, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [journeyResult.lastID, 'basics', 'Basics', 'Learn the basics', 'Book', '#2196F3', 1]
    );
  }
  
  console.log('Migrations complete');
  return dbService;
}

// This function isn't needed with our implementation but we keep it for compatibility
export async function openDb() {
  return dbService;
}