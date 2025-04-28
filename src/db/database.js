import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Database file path
const dbPath = join(__dirname, '../../database.sqlite');

// Open database connection
export async function openDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// Run migrations
export async function runMigrations() {
  const db = await openDb();
  
  // Get list of migration files
  const migrationsDir = join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  // Create migrations table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Get applied migrations
  const appliedMigrations = await db.all('SELECT name FROM migrations');
  const appliedMigrationNames = new Set(appliedMigrations.map(m => m.name));
  
  // Apply new migrations
  for (const migrationFile of migrationFiles) {
    if (!appliedMigrationNames.has(migrationFile)) {
      console.log(`Applying migration: ${migrationFile}`);
      
      const migrationPath = join(migrationsDir, migrationFile);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      // Begin transaction
      await db.exec('BEGIN TRANSACTION');
      
      try {
        // Apply migration
        await db.exec(migrationSql);
        
        // Record migration
        await db.run('INSERT INTO migrations (name) VALUES (?)', migrationFile);
        
        // Commit transaction
        await db.exec('COMMIT');
        console.log(`Migration applied: ${migrationFile}`);
      } catch (error) {
        // Rollback transaction on error
        await db.exec('ROLLBACK');
        console.error(`Migration failed: ${migrationFile}`, error);
        throw error;
      }
    }
  }
  
  return db;
}