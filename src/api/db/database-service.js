import { openDB } from 'idb';

const DB_NAME = 'prompt-journey-db';
const DB_VERSION = 2;

// Initialize the database
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion, newVersion, transaction) {
    console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
    
    // Apply schema based on the oldVersion
    switch (oldVersion) {
      case 0: // Initial setup or coming from version 0
        console.log('Applying schema version 1 (Initial setup)...');
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
        // Fall through to apply version 2 changes immediately after version 1
      case 1: // Upgrading from version 1
        console.log('Applying schema version 2 (adding sharing fields)...');
        if (db.objectStoreNames.contains('journeys')) {
          const journeyStore = transaction.objectStore('journeys');
          if (!journeyStore.indexNames.contains('is_shared')) {
            journeyStore.createIndex('is_shared', 'is_shared');
          }
          if (!journeyStore.indexNames.contains('share_id')) {
            journeyStore.createIndex('share_id', 'share_id', { unique: true });
          }
          console.log('Indices for is_shared and share_id ensured.');
        } else {
          console.error('Could not find journeys store during upgrade to v2!');
        }
        // Add breaks or fall-through for future versions
        break; // Break needed if we add version 3 later
      // case 2: 
      //   console.log('Applying schema version 3...');
      //   // ... changes for v3 ... 
      //   break;
      default:
        console.warn(`Unknown oldVersion (${oldVersion}) during upgrade.`);
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
      const normalizedQuery = query.replace(/\s+/g, ' ').trim();
      console.log(`[DB Service - get] Checking normalized query: "${normalizedQuery}"`);
      
      // Handle journey fetch by ID
      if (normalizedQuery.includes('FROM journeys WHERE id = ?')) {
        const id = params[0];
        console.log(`[DB Service - get] Matched journey fetch by ID: ${id}`);
        // db.get fetches the whole object, including any new columns like is_shared, share_id
        const journey = await db.get('journeys', id);
        // Add is_shared and share_id defaults if they don't exist (for older records before migration)
        // Though migration should handle this, belt-and-suspenders approach:
        return journey ? { is_shared: 0, share_id: null, ...journey } : null;
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
      
      // Add handling for COUNT query
      if (normalizedQuery.includes('SELECT COUNT(*) as stepCount FROM steps WHERE journey_id = ?')) {
        const journeyId = params[0];
        const tx = db.transaction('steps', 'readonly');
        const index = tx.store.index('journey_id');
        // Use the count() method on the index
        const count = await index.count(journeyId);
        await tx.done;
        return { stepCount: count };
      }
      
      // Handle journey fetch by share_id (Simplified Check)
      if (normalizedQuery.includes('FROM journeys WHERE share_id = ?') && normalizedQuery.includes('AND is_shared = 1')) {
        const shareId = params[0];
        console.log(`[DB Service - get] Matched journey fetch by share_id: ${shareId}`);
        const tx = db.transaction('journeys', 'readonly');
        const index = tx.store.index('share_id');
        const journey = await index.get(shareId);
        await tx.done;
        
        if (journey && journey.is_shared === 1) {
          console.log('[DB Service - get] Found shared journey:', journey);
          return { is_shared: 1, share_id: journey.share_id, ...journey };
        } else {
          console.warn(`[DB Service - get] Journey with share_id ${shareId} not found or not shared (is_shared=${journey?.is_shared}).`);
          return null;
        }
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
      
      // Handle Enable Sharing Update (Revised)
      if (normalizedQuery.startsWith('UPDATE journeys SET is_shared = 1') && normalizedQuery.includes('WHERE id = ?')) {
        const [shareId, idParam] = params; // Get ID parameter
        console.log(`[DB Service - run] Raw ID param for enable sharing: ${idParam} (type: ${typeof idParam})`);
        const id = parseInt(idParam, 10); // Explicitly parse as integer
        
        if (isNaN(id)) { // Check if parsing failed or input was invalid
          console.error('[DB Service - run] Invalid Journey ID for enabling sharing:', idParam);
          // Avoid transaction errors by not proceeding
          // Since we haven't started the tx yet, just return
          return { changes: 0 };
        }
        
        console.log(`[DB Service - run] Parsed ID for store.get: ${id} (type: ${typeof id})`);
        const tx = db.transaction('journeys', 'readwrite');
        const store = tx.objectStore('journeys');
        
        try {
          console.log(`[DB Service - run] Attempting store.get with ID: ${id} (type: ${typeof id})`);
          const journey = await store.get(id); // Use parsed ID
          if (journey) {
            const updatedJourney = {
              id: journey.id, // Keep original ID
              name: journey.name, // Keep original name
              description: journey.description, // Keep original description
              icon: journey.icon, // Keep original icon
              created_at: journey.created_at, // Keep original creation date
              is_shared: 1, // Update sharing status
              share_id: shareId, // Update share ID
              updated_at: new Date().toISOString() // Update modification date
            };
            console.log('[DB Service - run] Object to PUT (Enable Sharing):', updatedJourney);
            await store.put(updatedJourney);
            console.log(`[DB Service - run] Updated journey ${id} for enabling sharing.`);
          } else {
            console.warn(`[DB Service - run] Journey ${id} not found for enabling sharing.`);
          }
          await tx.done;
          return { changes: journey ? 1 : 0 };
        } catch (getPutError) {
          console.error('[DB Service - run] Error during get/put in enable sharing:', getPutError);
          await tx.done; // Ensure transaction completes even on error
          throw getPutError; // Re-throw error to be caught higher up
        }
      }
      
      // Handle Disable Sharing Update (Revised)
      if (normalizedQuery.startsWith('UPDATE journeys SET is_shared = 0') && normalizedQuery.includes('WHERE id = ?')) {
        const [idParam] = params; // Get ID parameter
        console.log(`[DB Service - run] Raw ID param for disable sharing: ${idParam} (type: ${typeof idParam})`);
        const id = parseInt(idParam, 10); // Explicitly parse as integer
        
        if (isNaN(id)) { // Check if parsing failed
          console.error('[DB Service - run] Invalid Journey ID for disabling sharing:', idParam);
          return { changes: 0 };
        }
        
        console.log(`[DB Service - run] Parsed ID for store.get: ${id} (type: ${typeof id})`);
        const tx = db.transaction('journeys', 'readwrite');
        const store = tx.objectStore('journeys');
        
        try {
          console.log(`[DB Service - run] Attempting store.get with ID: ${id} (type: ${typeof id})`);
          const journey = await store.get(id); // Use parsed ID
          if (journey) {
            const updatedJourney = {
              id: journey.id,
              name: journey.name,
              description: journey.description,
              icon: journey.icon,
              created_at: journey.created_at,
              is_shared: 0, // Update sharing status
              share_id: null, // Clear share ID
              updated_at: new Date().toISOString() // Update modification date
            };
            console.log('[DB Service - run] Object to PUT (Disable Sharing):', updatedJourney);
            await store.put(updatedJourney);
            console.log(`[DB Service - run] Disabled sharing for journey ${id}.`);
          } else {
            console.warn(`[DB Service - run] Journey ${id} not found for disabling sharing.`);
          }
          await tx.done;
          return { changes: journey ? 1 : 0 };
        } catch (getPutError) {
          console.error('[DB Service - run] Error during get/put in disable sharing:', getPutError);
          await tx.done;
          throw getPutError;
        }
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
  },

  // --- NEW: Dedicated function for updating sharing status ---
  async setJourneySharing(id, isShared, shareId = null) {
    const db = await getDB();
    const tx = db.transaction('journeys', 'readwrite');
    const store = tx.objectStore('journeys');
    console.log(`[DB Service - setJourneySharing] Updating ID: ${id}, isShared: ${isShared}, shareId: ${shareId}`);
    
    try {
      const journey = await store.get(id);
      if (!journey) {
        console.warn(`[DB Service - setJourneySharing] Journey ${id} not found.`);
        await tx.done; // Ensure transaction completes
        return { changes: 0 };
      }
      
      const updatedJourney = {
        ...journey, // Keep existing fields
        is_shared: isShared ? 1 : 0, // Set new status
        share_id: isShared ? shareId : null, // Set or clear shareId
        updated_at: new Date().toISOString() // Update timestamp
      };
      
      console.log('[DB Service - setJourneySharing] Putting updated journey:', updatedJourney);
      await store.put(updatedJourney);
      await tx.done;
      console.log('[DB Service - setJourneySharing] Update successful.');
      return { changes: 1 };
    } catch (error) {
      console.error('[DB Service - setJourneySharing] Error during transaction:', error);
      // Attempt to complete the transaction even on error
      try { await tx.done; } catch (txError) { console.error('Error completing transaction after error:', txError); }
      throw error; // Re-throw the original error
    }
  }
};

export default dbService; 