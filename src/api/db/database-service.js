import { openDB } from 'idb';

const DB_NAME = 'prompt-journey-db';
const DB_VERSION = 1;

// Initialize the database
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Create stores for our tables
    if (!db.objectStoreNames.contains('journeys')) {
      const journeyStore = db.createObjectStore('journeys', { keyPath: 'id', autoIncrement: true });
      journeyStore.createIndex('created_at', 'created_at');
    }
    
    if (!db.objectStoreNames.contains('steps')) {
      const stepStore = db.createObjectStore('steps', { keyPath: 'id', autoIncrement: true });
      stepStore.createIndex('journey_id', 'journey_id');
      stepStore.createIndex('position', 'position');
    }
    
    if (!db.objectStoreNames.contains('prompts')) {
      const promptStore = db.createObjectStore('prompts', { keyPath: 'id', autoIncrement: true });
      promptStore.createIndex('step_id', 'step_id');
    }
    
    if (!db.objectStoreNames.contains('tags')) {
      const tagStore = db.createObjectStore('tags', { keyPath: 'id', autoIncrement: true });
      tagStore.createIndex('name', 'name', { unique: true });
    }
    
    if (!db.objectStoreNames.contains('prompt_tags')) {
      const promptTagStore = db.createObjectStore('prompt_tags', { keyPath: ['prompt_id', 'tag_id'] });
      promptTagStore.createIndex('prompt_id', 'prompt_id');
      promptTagStore.createIndex('tag_id', 'tag_id');
    }
  }
});

// Helper function to ensure DB connection
const getDB = async () => {
  try {
    return await dbPromise;
  } catch (error) {
    console.error('Error connecting to IndexedDB:', error);
    throw new Error('Failed to connect to database');
  }
};

// Helper for simulating SQL-like queries
const dbService = {
  // Execute a "get" query (one result)
  async get(query, params = []) {
    try {
      const db = await getDB();
      
      // Normalize query by removing whitespace and newlines
      const normalizedQuery = query.replace(/\s+/g, ' ').trim();
      
      // Simple query parsing
      if (normalizedQuery.includes('SELECT * FROM journeys WHERE id = ?')) {
        const id = params[0];
        return await db.get('journeys', id);
      }
      
      if (normalizedQuery.includes('SELECT * FROM steps WHERE id = ?')) {
        const id = params[0];
        return await db.get('steps', id);
      }
      
      if (normalizedQuery.includes('SELECT * FROM prompts WHERE step_id = ?')) {
        const stepId = params[0];
        const tx = db.transaction('prompts', 'readonly');
        const index = tx.store.index('step_id');
        const result = await index.get(stepId);
        await tx.done;
        return result;
      }
      
      if (normalizedQuery.includes('SELECT id FROM prompts WHERE step_id = ?')) {
        const stepId = params[0];
        const tx = db.transaction('prompts', 'readonly');
        const index = tx.store.index('step_id');
        const result = await index.get(stepId);
        await tx.done;
        return result ? { id: result.id } : null;
      }
      
      if (normalizedQuery.includes('SELECT id FROM tags WHERE name = ?')) {
        const name = params[0];
        const tx = db.transaction('tags', 'readonly');
        const index = tx.store.index('name');
        const result = await index.get(name);
        await tx.done;
        return result ? { id: result.id } : null;
      }
      
      if (normalizedQuery.includes('SELECT MAX(position) as maxPos FROM steps WHERE journey_id = ?')) {
        const journeyId = params[0];
        const tx = db.transaction('steps', 'readonly');
        const index = tx.store.index('journey_id');
        const steps = await index.getAll(journeyId);
        await tx.done;
        
        if (steps.length === 0) {
          return { maxPos: null };
        }
        
        const maxPos = Math.max(...steps.map(step => step.position));
        return { maxPos };
      }
      
      console.warn('Unhandled get query:', query, params);
      return null;
    } catch (error) {
      console.error('Error in get query:', query, params, error);
      throw error;
    }
  },
  
  // Execute a "all" query (multiple results)
  async all(query, params = []) {
    try {
      const db = await getDB();
      
      // Normalize query by removing whitespace and newlines
      const normalizedQuery = query.replace(/\s+/g, ' ').trim();
      
      if (normalizedQuery.includes('SELECT * FROM journeys ORDER BY created_at DESC')) {
        const tx = db.transaction('journeys', 'readonly');
        const store = tx.objectStore('journeys');
        const journeys = await store.getAll();
        await tx.done;
        return journeys.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      
      if (normalizedQuery.includes('SELECT * FROM steps WHERE journey_id = ? ORDER BY position ASC')) {
        const journeyId = params[0];
        const tx = db.transaction('steps', 'readonly');
        const index = tx.store.index('journey_id');
        const steps = await index.getAll(journeyId);
        await tx.done;
        return steps.sort((a, b) => a.position - b.position);
      }
      
      // Check for tag query with normalized pattern
      if (normalizedQuery.includes('SELECT t.id, t.name FROM tags t') && 
          normalizedQuery.includes('JOIN prompt_tags pt') && 
          normalizedQuery.includes('WHERE pt.prompt_id = ?')) {
        const promptId = params[0];
        
        try {
          const tx = db.transaction(['prompt_tags', 'tags'], 'readonly');
          
          // First get all prompt_tags for this prompt
          const promptTagIndex = tx.objectStore('prompt_tags').index('prompt_id');
          const promptTags = await promptTagIndex.getAll(promptId);
          
          // Then get the tag details for each tag_id
          const tagsStore = tx.objectStore('tags');
          const tags = [];
          
          for (const pt of promptTags) {
            try {
              const tag = await tagsStore.get(pt.tag_id);
              if (tag) {
                tags.push({ id: tag.id, name: tag.name });
              }
            } catch (error) {
              console.error('Error fetching tag:', error);
            }
          }
          
          await tx.done;
          return tags;
        } catch (error) {
          console.error('Error in tag query:', error);
          return [];
        }
      }
      
      console.warn('Unhandled all query:', query, params);
      return [];
    } catch (error) {
      console.error('Error in all query:', query, params, error);
      throw error;
    }
  },
  
  // Execute a "run" query (no results, just run it)
  async run(query, params = []) {
    try {
      const db = await getDB();
      const normalizedQuery = query.replace(/\s+/g, ' ').trim();
      
      // Insert journey
      if (normalizedQuery.includes('INSERT INTO journeys')) {
        const [name, description, icon] = params;
        const tx = db.transaction('journeys', 'readwrite');
        const store = tx.objectStore('journeys');
        const id = await store.add({
          name,
          description,
          icon,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        await tx.done;
        return { lastID: id };
      }
      
      // Update journey
      if (normalizedQuery.includes('UPDATE journeys SET')) {
        const [name, description, icon, id] = params;
        const tx = db.transaction('journeys', 'readwrite');
        const store = tx.objectStore('journeys');
        const journey = await store.get(id);
        
        if (journey) {
          await store.put({
            ...journey,
            name,
            description,
            icon,
            updated_at: new Date().toISOString()
          });
        }
        
        await tx.done;
        return { changes: 1 };
      }
      
      // Delete journey
      if (normalizedQuery.includes('DELETE FROM journeys WHERE id = ?')) {
        const id = params[0];
        const tx = db.transaction('journeys', 'readwrite');
        await tx.objectStore('journeys').delete(id);
        await tx.done;
        return { changes: 1 };
      }
      
      // Insert step
      if (normalizedQuery.includes('INSERT INTO steps')) {
        const [journeyId, stepId, title, description, icon, color, position] = params;
        
        // Verify journey exists
        const journeyTx = db.transaction('journeys', 'readonly');
        const journey = await journeyTx.objectStore('journeys').get(journeyId);
        await journeyTx.done;
        
        if (!journey) {
          throw new Error(`Journey with ID ${journeyId} not found`);
        }
        
        const tx = db.transaction('steps', 'readwrite');
        const store = tx.objectStore('steps');
        
        const newStep = {
          journey_id: journeyId,
          step_id: stepId,
          title,
          description,
          icon,
          color,
          position,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const id = await store.add(newStep);
        await tx.done;
        return { lastID: id };
      }
      
      // Update step
      if (normalizedQuery.includes('UPDATE steps SET title = ?, description = ?, icon = ?, color = ? WHERE id = ?')) {
        const [title, description, icon, color, id] = params;
        const tx = db.transaction('steps', 'readwrite');
        const store = tx.objectStore('steps');
        const step = await store.get(id);
        
        if (!step) {
          throw new Error(`Step with ID ${id} not found`);
        }
        
        await store.put({
          ...step,
          title,
          description,
          icon,
          color,
          updated_at: new Date().toISOString()
        });
        
        await tx.done;
        return { changes: 1 };
      }
      
      // Delete step
      if (normalizedQuery.includes('DELETE FROM steps WHERE id = ?')) {
        const id = params[0];
        
        // First get the step to verify it exists
        const readTx = db.transaction('steps', 'readonly');
        const step = await readTx.objectStore('steps').get(id);
        await readTx.done;
        
        if (!step) {
          throw new Error(`Step with ID ${id} not found`);
        }
        
        const tx = db.transaction('steps', 'readwrite');
        await tx.objectStore('steps').delete(id);
        await tx.done;
        return { changes: 1 };
      }
      
      // Update step positions
      if (normalizedQuery.includes('UPDATE steps SET position = position - 1 WHERE journey_id = ? AND position > ?')) {
        const [journeyId, position] = params;
        const tx = db.transaction('steps', 'readwrite');
        const index = tx.store.index('journey_id');
        const steps = await index.getAll(journeyId);
        const store = tx.objectStore('steps');
        
        for (const step of steps) {
          if (step.position > position) {
            await store.put({
              ...step,
              position: step.position - 1
            });
          }
        }
        
        await tx.done;
        return { changes: steps.length };
      }
      
      // Reorder steps
      if (normalizedQuery.includes('UPDATE steps SET position = ? WHERE id = ? AND journey_id = ?')) {
        const [position, id, journeyId] = params;
        const tx = db.transaction('steps', 'readwrite');
        const store = tx.objectStore('steps');
        const step = await store.get(id);
        
        if (step && step.journey_id === journeyId) {
          await store.put({
            ...step,
            position,
            updated_at: new Date().toISOString()
          });
        }
        
        await tx.done;
        return { changes: 1 };
      }
      
      // Insert prompt
      if (normalizedQuery.includes('INSERT INTO prompts')) {
        const [stepId, content] = params;
        
        // Verify step exists
        const stepTx = db.transaction('steps', 'readonly');
        const step = await stepTx.objectStore('steps').get(stepId);
        await stepTx.done;
        
        if (!step) {
          throw new Error(`Step with ID ${stepId} not found`);
        }
        
        const tx = db.transaction('prompts', 'readwrite');
        const store = tx.objectStore('prompts');
        
        const newPrompt = {
          step_id: stepId,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const id = await store.add(newPrompt);
        await tx.done;
        return { lastID: id };
      }
      
      // Update prompt
      if (normalizedQuery.includes('UPDATE prompts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')) {
        const [content, id] = params;
        const tx = db.transaction('prompts', 'readwrite');
        const store = tx.objectStore('prompts');
        const prompt = await store.get(id);
        
        if (!prompt) {
          throw new Error(`Prompt with ID ${id} not found`);
        }
        
        await store.put({
          ...prompt,
          content,
          updated_at: new Date().toISOString()
        });
        
        await tx.done;
        return { changes: 1 };
      }
      
      // Insert tag
      if (normalizedQuery.includes('INSERT INTO tags')) {
        const [name] = params;
        const tx = db.transaction('tags', 'readwrite');
        const store = tx.objectStore('tags');
        
        // Check if tag with this name already exists
        const index = store.index('name');
        const existingTag = await index.get(name);
        
        if (existingTag) {
          await tx.done;
          return { lastID: existingTag.id };
        }
        
        const id = await store.add({
          name,
          created_at: new Date().toISOString()
        });
        await tx.done;
        return { lastID: id };
      }
      
      // Insert prompt_tag
      if (normalizedQuery.includes('INSERT INTO prompt_tags')) {
        const [promptId, tagId] = params;
        
        // Verify prompt and tag exist
        const checkTx = db.transaction(['prompts', 'tags'], 'readonly');
        const prompt = await checkTx.objectStore('prompts').get(promptId);
        const tag = await checkTx.objectStore('tags').get(tagId);
        await checkTx.done;
        
        if (!prompt) {
          throw new Error(`Prompt with ID ${promptId} not found`);
        }
        
        if (!tag) {
          throw new Error(`Tag with ID ${tagId} not found`);
        }
        
        const tx = db.transaction('prompt_tags', 'readwrite');
        const store = tx.objectStore('prompt_tags');
        
        // Add the association, overwrite if it already exists
        await store.put({
          prompt_id: promptId,
          tag_id: tagId
        });
        
        await tx.done;
        return { changes: 1 };
      }
      
      // Delete prompt_tags
      if (normalizedQuery.includes('DELETE FROM prompt_tags WHERE prompt_id = ?')) {
        const promptId = params[0];
        const tx = db.transaction('prompt_tags', 'readwrite');
        const index = tx.objectStore('prompt_tags').index('prompt_id');
        const promptTags = await index.getAll(promptId);
        const store = tx.objectStore('prompt_tags');
        
        // Delete each association one by one
        for (const pt of promptTags) {
          await store.delete([pt.prompt_id, pt.tag_id]);
        }
        
        await tx.done;
        return { changes: promptTags.length };
      }
      
      console.warn('Unhandled run query:', query, params);
      return { changes: 0 };
    } catch (error) {
      console.error('Error in run query:', query, params, error);
      throw error;
    }
  },
  
  // Execute any SQL query 
  async exec(query) {
    try {
      const normalizedQuery = query.replace(/\s+/g, ' ').trim();
      
      console.warn('Exec not fully implemented:', normalizedQuery);
      
      if (normalizedQuery.includes('CREATE TABLE IF NOT EXISTS migrations')) {
        // Migrations table is not needed in this implementation
        return;
      }
      
      if (normalizedQuery.includes('BEGIN TRANSACTION')) {
        // Transaction handling is done automatically
        return;
      }
      
      if (normalizedQuery.includes('COMMIT')) {
        // Transaction handling is done automatically
        return;
      }
      
      if (normalizedQuery.includes('ROLLBACK')) {
        // Transaction handling is done automatically
        return;
      }
    } catch (error) {
      console.error('Error in exec query:', query, error);
      throw error;
    }
  }
};

export default dbService; 