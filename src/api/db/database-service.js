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

// Helper for simulating SQL-like queries
const dbService = {
  // Execute a "get" query (one result)
  async get(query, params = []) {
    const db = await dbPromise;
    
    // Simple query parsing
    if (query.includes('SELECT * FROM journeys WHERE id = ?')) {
      const id = params[0];
      return db.get('journeys', id);
    }
    
    if (query.includes('SELECT * FROM steps WHERE id = ?')) {
      const id = params[0];
      return db.get('steps', id);
    }
    
    if (query.includes('SELECT * FROM prompts WHERE step_id = ?')) {
      const stepId = params[0];
      const tx = db.transaction('prompts', 'readonly');
      const index = tx.store.index('step_id');
      const result = await index.get(stepId);
      await tx.done;
      return result;
    }
    
    if (query.includes('SELECT id FROM prompts WHERE step_id = ?')) {
      const stepId = params[0];
      const tx = db.transaction('prompts', 'readonly');
      const index = tx.store.index('step_id');
      const result = await index.get(stepId);
      await tx.done;
      return result ? { id: result.id } : null;
    }
    
    if (query.includes('SELECT id FROM tags WHERE name = ?')) {
      const name = params[0];
      const tx = db.transaction('tags', 'readonly');
      const index = tx.store.index('name');
      const result = await index.get(name);
      await tx.done;
      return result ? { id: result.id } : null;
    }
    
    if (query.includes('SELECT MAX(position) as maxPos FROM steps WHERE journey_id = ?')) {
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
  },
  
  // Execute a "all" query (multiple results)
  async all(query, params = []) {
    const db = await dbPromise;
    
    if (query.includes('SELECT * FROM journeys ORDER BY created_at DESC')) {
      const tx = db.transaction('journeys', 'readonly');
      const store = tx.objectStore('journeys');
      const journeys = await store.getAll();
      await tx.done;
      return journeys.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    if (query.includes('SELECT * FROM steps WHERE journey_id = ? ORDER BY position ASC')) {
      const journeyId = params[0];
      const tx = db.transaction('steps', 'readonly');
      const index = tx.store.index('journey_id');
      const steps = await index.getAll(journeyId);
      await tx.done;
      return steps.sort((a, b) => a.position - b.position);
    }
    
    if (query.includes('SELECT t.id, t.name FROM tags t JOIN prompt_tags pt')) {
      const promptId = params[0];
      const tx = db.transaction(['prompt_tags', 'tags'], 'readonly');
      const promptTagsIndex = tx.objectStore('prompt_tags').index('prompt_id');
      const promptTags = await promptTagsIndex.getAll(promptId);
      
      const tags = [];
      for (const pt of promptTags) {
        const tag = await tx.objectStore('tags').get(pt.tag_id);
        if (tag) {
          tags.push({ id: tag.id, name: tag.name });
        }
      }
      
      await tx.done;
      return tags;
    }
    
    console.warn('Unhandled all query:', query, params);
    return [];
  },
  
  // Execute a "run" query (no results, just run it)
  async run(query, params = []) {
    const db = await dbPromise;
    
    // Insert journey
    if (query.includes('INSERT INTO journeys')) {
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
    if (query.includes('UPDATE journeys SET')) {
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
    if (query.includes('DELETE FROM journeys WHERE id = ?')) {
      const id = params[0];
      const tx = db.transaction('journeys', 'readwrite');
      await tx.objectStore('journeys').delete(id);
      await tx.done;
      return { changes: 1 };
    }
    
    // Insert step
    if (query.includes('INSERT INTO steps')) {
      const [journeyId, stepId, title, description, icon, color, position] = params;
      const tx = db.transaction('steps', 'readwrite');
      const store = tx.objectStore('steps');
      const id = await store.add({
        journey_id: journeyId,
        step_id: stepId,
        title,
        description,
        icon,
        color,
        position,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      await tx.done;
      return { lastID: id };
    }
    
    // Update step
    if (query.includes('UPDATE steps SET title = ?, description = ?, icon = ?, color = ? WHERE id = ?')) {
      const [title, description, icon, color, id] = params;
      const tx = db.transaction('steps', 'readwrite');
      const store = tx.objectStore('steps');
      const step = await store.get(id);
      
      if (step) {
        await store.put({
          ...step,
          title,
          description,
          icon,
          color,
          updated_at: new Date().toISOString()
        });
      }
      
      await tx.done;
      return { changes: 1 };
    }
    
    // Delete step
    if (query.includes('DELETE FROM steps WHERE id = ?')) {
      const id = params[0];
      const tx = db.transaction('steps', 'readwrite');
      await tx.objectStore('steps').delete(id);
      await tx.done;
      return { changes: 1 };
    }
    
    // Update step positions
    if (query.includes('UPDATE steps SET position = position - 1 WHERE journey_id = ? AND position > ?')) {
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
    if (query.includes('UPDATE steps SET position = ? WHERE id = ? AND journey_id = ?')) {
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
    if (query.includes('INSERT INTO prompts')) {
      const [stepId, content] = params;
      const tx = db.transaction('prompts', 'readwrite');
      const store = tx.objectStore('prompts');
      const id = await store.add({
        step_id: stepId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      await tx.done;
      return { lastID: id };
    }
    
    // Update prompt
    if (query.includes('UPDATE prompts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')) {
      const [content, id] = params;
      const tx = db.transaction('prompts', 'readwrite');
      const store = tx.objectStore('prompts');
      const prompt = await store.get(id);
      
      if (prompt) {
        await store.put({
          ...prompt,
          content,
          updated_at: new Date().toISOString()
        });
      }
      
      await tx.done;
      return { changes: 1 };
    }
    
    // Insert tag
    if (query.includes('INSERT INTO tags')) {
      const [name] = params;
      const tx = db.transaction('tags', 'readwrite');
      const store = tx.objectStore('tags');
      const id = await store.add({
        name,
        created_at: new Date().toISOString()
      });
      await tx.done;
      return { lastID: id };
    }
    
    // Insert prompt_tag
    if (query.includes('INSERT INTO prompt_tags')) {
      const [promptId, tagId] = params;
      const tx = db.transaction('prompt_tags', 'readwrite');
      const store = tx.objectStore('prompt_tags');
      await store.add({
        prompt_id: promptId,
        tag_id: tagId
      });
      await tx.done;
      return { changes: 1 };
    }
    
    // Delete prompt_tags
    if (query.includes('DELETE FROM prompt_tags WHERE prompt_id = ?')) {
      const promptId = params[0];
      const tx = db.transaction('prompt_tags', 'readwrite');
      const index = tx.objectStore('prompt_tags').index('prompt_id');
      const promptTags = await index.getAll(promptId);
      const store = tx.objectStore('prompt_tags');
      
      for (const pt of promptTags) {
        await store.delete([pt.prompt_id, pt.tag_id]);
      }
      
      await tx.done;
      return { changes: promptTags.length };
    }
    
    console.warn('Unhandled run query:', query, params);
    return { changes: 0 };
  },
  
  // Execute any SQL query 
  async exec(query) {
    console.warn('Exec not fully implemented:', query);
    
    if (query.includes('CREATE TABLE IF NOT EXISTS migrations')) {
      // Migrations table is not needed in this implementation
      return;
    }
    
    if (query.includes('BEGIN TRANSACTION')) {
      // Transaction handling is done automatically
      return;
    }
    
    if (query.includes('COMMIT')) {
      // Transaction handling is done automatically
      return;
    }
    
    if (query.includes('ROLLBACK')) {
      // Transaction handling is done automatically
      return;
    }
  }
};

export default dbService; 