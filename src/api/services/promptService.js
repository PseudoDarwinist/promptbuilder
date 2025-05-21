import { openDb } from '../../db/database';

export const promptService = {
  // Get prompt by ID (tags removed)
  async getPrompt(promptId) {
    const db = await openDb();
    
    // Get prompt
    const prompt = await db.get('SELECT * FROM prompts WHERE id = ?', promptId);
    
    if (!prompt) {
      throw new Error(`Prompt with ID ${promptId} not found`);
    }
    
    return prompt;
  },
  
  // Update a prompt
  async updatePrompt(promptId, promptData) {
    const db = await openDb();
    
    // Update prompt
    await db.run(
      'UPDATE prompts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [promptData.content, promptId]
    );
    
    return this.getPrompt(promptId);
  },
  
  // Record prompt usage
  async recordPromptUsage(promptId) {
    const db = await openDb();
    
    await db.run(
      'UPDATE prompts SET last_used = CURRENT_TIMESTAMP WHERE id = ?',
      promptId
    );
    
    return this.getPrompt(promptId);
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