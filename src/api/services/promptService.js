import { openDb } from '../../db/database';

export const promptService = {
  // Get prompt by ID with tags
  async getPromptWithTags(promptId) {
    const db = await openDb();
    
    // Get prompt
    const prompt = await db.get('SELECT * FROM prompts WHERE id = ?', promptId);
    
    if (!prompt) {
      throw new Error(`Prompt with ID ${promptId} not found`);
    }
    
    // Get tags for prompt
    const tags = await db.all(`
      SELECT t.id, t.name 
      FROM tags t
      JOIN prompt_tags pt ON t.id = pt.tag_id
      WHERE pt.prompt_id = ?
    `, promptId);
    
    return { ...prompt, tags };
  },
  
  // Update a prompt
  async updatePrompt(promptId, promptData) {
    const db = await openDb();
    
    // Update prompt
    await db.run(
      'UPDATE prompts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [promptData.content, promptId]
    );
    
    // Update tags if provided
    if (promptData.tags) {
      // Remove existing tag associations
      await db.run('DELETE FROM prompt_tags WHERE prompt_id = ?', promptId);
      
      // Add new tag associations
      for (const tagName of promptData.tags) {
        // Check if tag exists
        let tag = await db.get('SELECT id FROM tags WHERE name = ?', tagName);
        
        // If tag doesn't exist, create it
        if (!tag) {
          const tagResult = await db.run('INSERT INTO tags (name) VALUES (?)', tagName);
          tag = { id: tagResult.lastID };
        }
        
        // Associate tag with prompt
        await db.run(
          'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
          [promptId, tag.id]
        );
      }
    }
    
    return this.getPromptWithTags(promptId);
  },
  
  // Record prompt usage
  async recordPromptUsage(promptId) {
    const db = await openDb();
    
    await db.run(
      'UPDATE prompts SET last_used = CURRENT_TIMESTAMP WHERE id = ?',
      promptId
    );
    
    return this.getPromptWithTags(promptId);
  },
  
  // Store AI output for a prompt
  async storeOutput(promptId, content) {
    const db = await openDb();
    
    const result = await db.run(
      'INSERT INTO outputs (prompt_id, content) VALUES (?, ?)',
      [promptId, content]
    );
    
    return {
      id: result.lastID,
      prompt_id: promptId,
      content,
      created_at: new Date().toISOString()
    };
  },
  
  // Get outputs for a prompt
  async getOutputs(promptId) {
    const db = await openDb();
    
    return db.all(
      'SELECT * FROM outputs WHERE prompt_id = ? ORDER BY created_at DESC',
      promptId
    );
  }
};