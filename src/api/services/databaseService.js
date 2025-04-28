import { initBackend } from "absurd-sql/dist/indexeddb-main-thread";
import { SQLiteFS } from "absurd-sql";
import * as SQLite from "sql.js";

// Database initialization and interface for browser environment
class DatabaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return this.db;
    }

    try {
      // Initialize SQL.js
      const SQL = await SQLite.default();
      
      // Set up filesystem
      const sqliteFS = new SQLiteFS(SQL.FS, {});
      SQL.register_for_idb(sqliteFS);
      
      // Initialize backend
      initBackend(SQL);
      
      // Open database
      this.db = new SQL.Database("promptflow.sqlite", { filename: true });
      
      // Run initial schema setup
      await this.runMigrations();
      
      this.initialized = true;
      return this.db;
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  async runMigrations() {
    const db = await this.getDb();
    
    // Create migrations table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Define migrations
    const migrations = [
      {
        name: "001_create_initial_schema.sql",
        sql: `
          -- Create journeys table
          CREATE TABLE IF NOT EXISTS journeys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create steps table
          CREATE TABLE IF NOT EXISTS steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journey_id INTEGER NOT NULL,
            step_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            icon TEXT NOT NULL,
            color TEXT NOT NULL,
            position INTEGER NOT NULL,
            FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
            UNIQUE(journey_id, step_id)
          );
          
          -- Create prompts table
          CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            step_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP,
            FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE
          );
          
          -- Create tags table
          CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
          );
          
          -- Create prompt_tags junction table
          CREATE TABLE IF NOT EXISTS prompt_tags (
            prompt_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (prompt_id, tag_id),
            FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
          );
          
          -- Create outputs table for storing AI responses
          CREATE TABLE IF NOT EXISTS outputs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
          );
          
          -- Add indexes for performance
          CREATE INDEX IF NOT EXISTS idx_steps_journey_id ON steps(journey_id);
          CREATE INDEX IF NOT EXISTS idx_prompts_step_id ON prompts(step_id);
          CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt_id ON prompt_tags(prompt_id);
          CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag_id ON prompt_tags(tag_id);
        `
      },
      {
        name: "002_seed_initial_data.sql",
        sql: `
          -- Insert default journey
          INSERT INTO journeys (name, description, icon)
          VALUES ('Software Development', 'End-to-end software development process', 'Code');
          
          -- Insert steps for the journey
          INSERT INTO steps (journey_id, step_id, title, description, icon, color, position)
          VALUES 
            (1, 'quest', 'The Quest Begins', 'Define what we seek to build', 'Compass', '#E07A5F', 0),
            (1, 'map', 'Mapping the Territory', 'Create the business requirements', 'Map', '#7A8B69', 1),
            (1, 'blueprint', 'The Blueprint', 'Develop product requirements', 'BookOpen', '#9381FF', 2),
            (1, 'crafting', 'Crafting the Vision', 'Design the application', 'Feather', '#C68B59', 3),
            (1, 'tales', 'Tales of the Users', 'Create user stories', 'MessageSquare', '#E07A5F', 4);
          
          -- Insert prompts for each step
          INSERT INTO prompts (step_id, content)
          VALUES 
            (1, 'I need a detailed specification for this project. Please help me capture the essence of what we''re building by addressing:\n\n1. The core problem we''re solving\n2. Who we''re solving it for\n3. What success looks like\n4. Key features required\n5. Technical constraints to consider'),
            (2, 'Based on our initial specification, please draft a formal Business Requirements Document (BRD) that includes:\n\n1. Project background and business need\n2. Stakeholder identification\n3. Success criteria and metrics\n4. Budget and timeline constraints\n5. Risk assessment'),
            (3, 'Using the business requirements, create a detailed Product Requirements Document (PRD) that includes:\n\n1. Detailed feature specifications\n2. User workflows and journeys\n3. Technical specifications\n4. Integration requirements\n5. Performance criteria\n6. Testing requirements'),
            (4, 'Based on our product requirements document, please help me design this application by providing:\n\n1. User interface mockups for key screens\n2. Information architecture\n3. Design system recommendations\n4. User flow diagrams\n5. Interactive prototype specifications'),
            (5, 'With our design approach established, please convert our requirements into Agile user stories following this format:\n\nAs a [type of user], I want [an action] so that [a benefit/value].\n\nEnsure each story is:\n1. Independent\n2. Negotiable\n3. Valuable\n4. Estimable\n5. Small\n6. Testable');
          
          -- Insert tags
          INSERT INTO tags (name) VALUES 
            ('Requirements'),
            ('Planning'),
            ('Design'),
            ('Development'),
            ('Testing'),
            ('Client');
          
          -- Associate tags with prompts
          INSERT INTO prompt_tags (prompt_id, tag_id) VALUES 
            (1, 1), -- Quest + Requirements
            (1, 2), -- Quest + Planning
            (1, 6), -- Quest + Client
            (2, 1), -- Map + Requirements
            (2, 2), -- Map + Planning
            (3, 1), -- Blueprint + Requirements
            (3, 2), -- Blueprint + Planning
            (4, 3), -- Crafting + Design
            (5, 4); -- Tales + Development
        `
      }
    ];
    
    // Get applied migrations
    const appliedResult = db.exec("SELECT name FROM migrations");
    const appliedMigrations = new Set();
    
    if (appliedResult.length > 0) {
      const rows = appliedResult[0].values;
      for (const row of rows) {
        appliedMigrations.add(row[0]);
      }
    }
    
    // Apply missing migrations
    for (const migration of migrations) {
      if (!appliedMigrations.has(migration.name)) {
        console.log(`Applying migration: ${migration.name}`);
        
        // Begin transaction
        db.exec("BEGIN TRANSACTION");
        
        try {
          // Apply migration
          db.exec(migration.sql);
          
          // Record migration
          const stmt = db.prepare("INSERT INTO migrations (name) VALUES (?)");
          stmt.run([migration.name]);
          stmt.free();
          
          // Commit transaction
          db.exec("COMMIT");
          console.log(`Migration applied: ${migration.name}`);
        } catch (error) {
          // Rollback transaction on error
          db.exec("ROLLBACK");
          console.error(`Migration failed: ${migration.name}`, error);
          throw error;
        }
      }
    }
  }

  async getDb() {
    if (!this.initialized) {
      await this.init();
    }
    return this.db;
  }

  async query(sql, params = []) {
    const db = await this.getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    
    stmt.free();
    return result;
  }

  async exec(sql) {
    const db = await this.getDb();
    return db.exec(sql);
  }

  async run(sql, params = []) {
    const db = await this.getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    
    const result = stmt.step();
    stmt.free();
    
    return {
      lastID: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] || null,
      changes: db.exec("SELECT changes()")[0]?.values[0][0] || 0
    };
  }

  async get(sql, params = []) {
    const results = await this.query(sql, params);
    return results[0] || null;
  }

  async all(sql, params = []) {
    return this.query(sql, params);
  }
}

// Export a singleton instance
const dbService = new DatabaseService();
export default dbService;