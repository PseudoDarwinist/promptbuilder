import { openDB } from 'idb';

const DB_NAME = 'prompt-journey-db';
const DB_VERSION = 3;

// Initialize the database
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion, newVersion, transaction) {
    console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
    
    // Check the list of object stores already created for debugging
    console.log('Existing object stores:', Array.from(db.objectStoreNames));
    
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
        // Do NOT break here, let it fall through to apply all upgrades
      case 1: // Applying version 2 changes
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
        // Do NOT break here, let it fall through to apply version 3 changes
      case 2: // Applying version 3 changes - Add prompt attachments
        console.log('Applying schema version 3 (Add file attachments)...');
        if (!db.objectStoreNames.contains('prompt_attachments')) {
          console.log('Creating prompt_attachments object store...');
          try {
            const attachmentStore = db.createObjectStore('prompt_attachments', { keyPath: 'id', autoIncrement: true });
            attachmentStore.createIndex('prompt_id', 'prompt_id');
            console.log('Successfully created prompt_attachments store');
          } catch (error) {
            console.error('Error creating prompt_attachments store:', error);
          }
        } else {
          console.log('prompt_attachments store already exists');
        }
        break;
      default:
        console.warn(`Unknown oldVersion (${oldVersion}) during upgrade.`);
    }
    
    // Log final state of object stores
    console.log('Object stores after upgrade:', Array.from(db.objectStoreNames));
  }
});

// Function to force delete and recreate the database
const forceResetDatabase = async () => {
  return new Promise((resolve, reject) => {
    console.log('Forcing database reset...');
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    
    deleteRequest.onerror = () => {
      console.error('Error deleting database');
      reject(new Error('Failed to delete database'));
    };
    
    deleteRequest.onsuccess = () => {
      console.log('Database successfully deleted. Will recreate on next access.');
      resolve();
    };
  });
};

// Helper function to ensure DB connection
const getDB = async () => {
  try {
    const db = await dbPromise;
    
    // Verify that prompt_attachments exists before any operations
    if (!Array.from(db.objectStoreNames).includes('prompt_attachments')) {
      console.error('prompt_attachments store is missing! Attempting to fix...');
      await forceResetDatabase();
      // Try to get a fresh instance
      return await openDB(DB_NAME, DB_VERSION);
    }
    
    return db;
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
      
      // Handle journey fetch by ID
      if (normalizedQuery.includes('FROM journeys WHERE id = ?')) {
        const id = params[0];
        const journey = await db.get('journeys', id);
        // Add is_shared and share_id defaults if they don't exist (for older records before migration)
        // Though migration should handle this, belt-and-suspenders approach:
        return journey ? { is_shared: 0, share_id: null, ...journey } : null;
      }
      
      // Handle step fetch by ID
      if (normalizedQuery.includes('SELECT * FROM steps WHERE id = ?')) {
        const id = params[0];
        return await db.get('steps', id);
      }
      
      // *** NEW: Handle prompt fetch by ID ***
      if (normalizedQuery.includes('SELECT * FROM prompts WHERE id = ?')) {
        const id = params[0];
        if (typeof id !== 'number' || isNaN(id)) {
          console.error('[DB Service - get] Invalid prompt ID for get:', id);
          return null;
        }
        return await db.get('prompts', id);
      }
      
      // Handle prompt fetch by step_id
      if (normalizedQuery.includes('SELECT * FROM prompts WHERE step_id = ?')) {
        const stepId = params[0];
        const tx = db.transaction('prompts', 'readonly');
        const index = tx.store.index('step_id');
        const result = await index.get(stepId);
        await tx.done;
        return result;
      }
      
      // Handle prompt ID fetch by step_id
      if (normalizedQuery.includes('SELECT id FROM prompts WHERE step_id = ?')) {
        const stepId = params[0];
        const tx = db.transaction('prompts', 'readonly');
        const index = tx.store.index('step_id');
        const result = await index.get(stepId);
        await tx.done;
        return result ? { id: result.id } : null;
      }
      
      // Handle tag ID fetch by name
      if (normalizedQuery.includes('SELECT id FROM tags WHERE name = ?')) {
        const name = params[0];
        const tx = db.transaction('tags', 'readonly');
        const index = tx.store.index('name');
        const result = await index.get(name);
        await tx.done;
        return result ? { id: result.id } : null;
      }
      
      // Handle MAX(position) fetch
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
        const tx = db.transaction('journeys', 'readonly');
        const index = tx.store.index('share_id');
        const journey = await index.get(shareId);
        await tx.done;
        
        if (journey && journey.is_shared === 1) {
          return { is_shared: 1, share_id: journey.share_id, ...journey };
        } else {
          return null;
        }
      }
      
      // Add support for prompt_attachments queries
      if (normalizedQuery.includes('SELECT * FROM prompt_attachments WHERE id = ?')) {
        const id = params[0];
        return await db.get('prompt_attachments', id);
      }

      // Handle attachment list fetch by prompt_id
      if (normalizedQuery.includes('SELECT id, filename, file_type, file_size, created_at FROM prompt_attachments WHERE prompt_id = ?')) {
        const promptId = params[0];
        const tx = db.transaction('prompt_attachments', 'readonly');
        const index = tx.store.index('prompt_id');
        const results = await index.getAll(promptId);
        await tx.done;
        return results;
      }
      
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
      const normalizedQuery = query.replace(/\s+/g, ' ').trim();
      
      // SELECT tags for a prompt
      if (normalizedQuery.includes('SELECT t.id, t.name FROM tags t JOIN prompt_tags pt ON t.id = pt.tag_id WHERE pt.prompt_id = ?')) {
        const promptId = params[0];
        
        const tx = db.transaction(['prompt_tags', 'tags'], 'readonly');
        const ptIndex = tx.objectStore('prompt_tags').index('prompt_id');
        const promptTags = await ptIndex.getAll(promptId);
        
        // For each tag_id in the promptTags results, get the tag name
        const tags = await Promise.all(
          promptTags.map(async (pt) => {
            const tag = await tx.objectStore('tags').get(pt.tag_id);
            return tag ? { id: tag.id, name: tag.name } : null;
          })
        );
        
        await tx.done;
        return tags.filter(Boolean);
      }
      
      // SELECT attachments for a prompt
      if (normalizedQuery.includes('SELECT id, filename, file_type, file_size, created_at FROM prompt_attachments WHERE prompt_id = ?')) {
        const promptId = params[0];
        
        try {
          // Validate promptId is a valid parameter for IndexedDB
          if (promptId === undefined || promptId === null) {
            console.error('ATTACHMENT DB DEBUG: Invalid prompt ID parameter:', promptId);
            return []; // Return empty array for invalid parameters
          }
          
          // Try to convert string IDs to numbers if needed
          const parsedPromptId = typeof promptId === 'string' ? parseInt(promptId, 10) : promptId;
          if (isNaN(parsedPromptId) || typeof parsedPromptId !== 'number') {
            console.error('ATTACHMENT DB DEBUG: Failed to parse prompt ID as number:', promptId);
            return []; // Return empty array for invalid parameters
          }
          
          // First check if the store exists
          if (!Array.from(db.objectStoreNames).includes('prompt_attachments')) {
            console.error('ATTACHMENT DB DEBUG: prompt_attachments store does not exist!');
            await forceResetDatabase();
            return []; // Return empty array to avoid breaking the app
          }
          
          // DIRECT ACCESS METHOD - Gets all attachments and filters by prompt_id in memory
          const tx = db.transaction('prompt_attachments', 'readonly');
          const store = tx.objectStore('prompt_attachments');
          
          // Get all attachments and filter manually
          const allAttachments = await store.getAll();
          
          // Filter by prompt_id
          const filteredAttachments = allAttachments.filter(a => {
            const match = a.prompt_id === parsedPromptId;
            return match;
          });
          
          await tx.done;
          
          // Map to ensure consistent object structure
          const result = filteredAttachments.map(attachment => ({
            id: attachment.id,
            filename: attachment.filename,
            file_type: attachment.file_type,
            file_size: attachment.file_size,
            created_at: attachment.created_at
          }));
          
          return result;
        } catch (error) {
          console.error('ATTACHMENT DB DEBUG: Error retrieving attachments:', error);
          return []; // Return empty array to avoid breaking the app
        }
      }
      
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
        const id = parseInt(idParam, 10); // Explicitly parse as integer
        
        if (isNaN(id)) { // Check if parsing failed or input was invalid
          return { changes: 0 };
        }
        
        const tx = db.transaction('journeys', 'readwrite');
        const store = tx.objectStore('journeys');
        
        try {
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
            await store.put(updatedJourney);
          }
          await tx.done;
          return { changes: journey ? 1 : 0 };
        } catch (getPutError) {
          await tx.done; // Ensure transaction completes even on error
          throw getPutError; // Re-throw error to be caught higher up
        }
      }
      
      // Handle Disable Sharing Update (Revised)
      if (normalizedQuery.startsWith('UPDATE journeys SET is_shared = 0') && normalizedQuery.includes('WHERE id = ?')) {
        const [idParam] = params; // Get ID parameter
        const id = parseInt(idParam, 10); // Explicitly parse as integer
        
        if (isNaN(id)) { // Check if parsing failed
          return { changes: 0 };
        }
        
        const tx = db.transaction('journeys', 'readwrite');
        const store = tx.objectStore('journeys');
        
        try {
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
            await store.put(updatedJourney);
          }
          await tx.done;
          return { changes: journey ? 1 : 0 };
        } catch (getPutError) {
          await tx.done;
          throw getPutError;
        }
      }
      
      // Insert attachment
      if (normalizedQuery.includes('INSERT INTO prompt_attachments')) {
        const [promptId, filename, fileType, fileSize, fileData] = params;
        
        // Validate promptId
        if (promptId === undefined || promptId === null) {
          console.error('DB SERVICE ERROR: Cannot insert attachment with invalid prompt ID:', promptId);
          throw new Error('Invalid prompt ID for attachment');
        }
        
        // Always ensure promptId is a number
        const parsedPromptId = typeof promptId === 'string' ? parseInt(promptId, 10) : promptId;
        if (isNaN(parsedPromptId) || typeof parsedPromptId !== 'number') {
          console.error('DB SERVICE ERROR: Failed to parse prompt ID as number:', promptId);
          throw new Error('Prompt ID must be a valid number');
        }
        
        // Verify prompt exists
        const promptTx = db.transaction('prompts', 'readonly');
        const prompt = await promptTx.objectStore('prompts').get(parsedPromptId);
        await promptTx.done;
        
        if (!prompt) {
          throw new Error(`Prompt with ID ${parsedPromptId} not found`);
        }
        
        const tx = db.transaction('prompt_attachments', 'readwrite');
        const store = tx.objectStore('prompt_attachments');
        
        const newAttachment = {
          prompt_id: parsedPromptId,
          filename,
          file_type: fileType,
          file_size: fileSize,
          file_data: fileData,
          created_at: new Date().toISOString()
        };
        
        const id = await store.add(newAttachment);
        await tx.done;
        return { lastID: id };
      }
      
      // Delete attachment
      if (normalizedQuery.includes('DELETE FROM prompt_attachments WHERE id = ?')) {
        const [id] = params;
        const tx = db.transaction('prompt_attachments', 'readwrite');
        const store = tx.objectStore('prompt_attachments');
        
        // Check if attachment exists
        const attachment = await store.get(id);
        if (!attachment) {
          await tx.done;
          return { changes: 0 };
        }
        
        await store.delete(id);
        await tx.done;
        return { changes: 1 };
      }
      
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
    
    try {
      const journey = await store.get(id);
      if (!journey) {
        await tx.done; // Ensure transaction completes
        return { changes: 0 };
      }
      
      const updatedJourney = {
        ...journey, // Keep existing fields
        is_shared: isShared ? 1 : 0, // Set new status
        share_id: isShared ? shareId : null, // Set or clear shareId
        updated_at: new Date().toISOString() // Update timestamp
      };
      
      await store.put(updatedJourney);
      await tx.done;
      return { changes: 1 };
    } catch (error) {
      // Attempt to complete the transaction even on error
      try { await tx.done; } catch (txError) { console.error('Error completing transaction after error:', txError); }
      throw error; // Re-throw the original error
    }
  },

  // Add this function to the dbService object
  async initializeDatabase() {
    console.log('Initializing database...');
    try {
      // First check if the database exists and what version it is
      const db = await getDB();
      console.log(`Database initialized with version: ${db.version}`);
      console.log('Object stores:', Array.from(db.objectStoreNames));
      
      // Check if all required stores exist
      const requiredStores = ['journeys', 'steps', 'prompts', 'tags', 'prompt_tags', 'prompt_attachments'];
      const missingStores = requiredStores.filter(
        store => !Array.from(db.objectStoreNames).includes(store)
      );
      
      if (missingStores.length > 0) {
        console.error(`Missing required object stores: ${missingStores.join(', ')}`);
        console.log('Will attempt to recreate the database...');
        await forceResetDatabase();
        
        // Try to initialize again
        const freshDb = await openDB(DB_NAME, DB_VERSION);
        console.log(`Database recreated with version: ${freshDb.version}`);
        console.log('New object stores:', Array.from(freshDb.objectStoreNames));
        
        return {
          success: true,
          resetPerformed: true,
          stores: Array.from(freshDb.objectStoreNames)
        };
      }
      
      return {
        success: true,
        resetPerformed: false,
        stores: Array.from(db.objectStoreNames)
      };
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default dbService; 