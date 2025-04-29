import dbService from '../db/database-service';

export const stepService = {
  // Get a step with its prompt
  async getStepWithPrompt(stepId) {
    try {
      // Get step
      const step = await dbService.get('SELECT * FROM steps WHERE id = ?', [stepId]);
      
      if (!step) {
        throw new Error(`Step with ID ${stepId} not found`);
      }
      
      // Get prompt for step
      const prompt = await dbService.get('SELECT * FROM prompts WHERE step_id = ?', [step.id]);
      
      // Get tags for prompt if available
      let tags = [];
      if (prompt) {
        tags = await dbService.all(`
          SELECT t.id, t.name 
          FROM tags t
          JOIN prompt_tags pt ON t.id = pt.tag_id
          WHERE pt.prompt_id = ?
        `, [prompt.id]);
      }
      
      console.log(`Retrieved step ${stepId} with prompt:`, prompt ? `ID ${prompt.id}` : 'no prompt');
      
      return { ...step, prompt: prompt ? { ...prompt, tags } : null };
    } catch (error) {
      console.error(`Error fetching step with ID ${stepId}:`, error);
      throw error;
    }
  },
  
  // Get all steps for a journey with their prompts
  async getStepsWithPrompts(journeyId) {
    try {
      // Get steps for journey
      const steps = await dbService.all(
        'SELECT * FROM steps WHERE journey_id = ? ORDER BY position ASC',
        [journeyId]
      );
      
      console.log(`Retrieved ${steps.length} steps for journey ${journeyId}`);
      
      // For each step, get its prompt and tags
      const stepsWithPrompts = await Promise.all(steps.map(async (step) => {
        const prompt = await dbService.get('SELECT * FROM prompts WHERE step_id = ?', [step.id]);
        
        let tags = [];
        if (prompt) {
          tags = await dbService.all(`
            SELECT t.id, t.name 
            FROM tags t
            JOIN prompt_tags pt ON t.id = pt.tag_id
            WHERE pt.prompt_id = ?
          `, [prompt.id]);
        }
        
        return { ...step, prompt: prompt ? { ...prompt, tags } : null };
      }));
      
      return stepsWithPrompts;
    } catch (error) {
      console.error(`Error fetching steps for journey ${journeyId}:`, error);
      throw error;
    }
  },
  
  // Create a new step
  async createStep(stepData) {
    try {
      if (!stepData) {
        throw new Error('No step data provided');
      }
      
      if (!stepData.journey_id) {
        throw new Error('Journey ID is required');
      }
      
      if (!stepData.step_id || !stepData.title) {
        throw new Error('Step ID and title are required');
      }
      
      console.log('Creating step with data:', JSON.stringify(stepData, null, 2));
      
      // Get current max position for the journey
      const result = await dbService.get(
        'SELECT MAX(position) as maxPos FROM steps WHERE journey_id = ?',
        [stepData.journey_id]
      );
      const position = result && result.maxPos !== null ? result.maxPos + 1 : 0;
      
      // Insert step
      const stepResult = await dbService.run(
        'INSERT INTO steps (journey_id, step_id, title, description, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          stepData.journey_id,
          stepData.step_id,
          stepData.title,
          stepData.description || '',
          stepData.icon || 'Compass',
          stepData.color || '#5B8FB9',
          position
        ]
      );
      
      const stepId = stepResult.lastID;
      console.log(`Created step with ID ${stepId}`);
      
      // Insert prompt if available
      if (stepData.prompt && stepData.prompt.content) {
        console.log(`Adding prompt for step ${stepId} with content:`, stepData.prompt.content.substring(0, 50) + '...');
        
        const promptResult = await dbService.run(
          'INSERT INTO prompts (step_id, content) VALUES (?, ?)',
          [stepId, stepData.prompt.content]
        );
        
        const promptId = promptResult.lastID;
        console.log(`Created prompt with ID ${promptId}`);
        
        // Insert tags if available
        if (stepData.prompt.tags && stepData.prompt.tags.length > 0) {
          console.log(`Adding ${stepData.prompt.tags.length} tags for prompt ${promptId}`);
          
          for (const tagName of stepData.prompt.tags) {
            // Check if tag exists
            let tag = await dbService.get('SELECT id FROM tags WHERE name = ?', [tagName]);
            
            // If tag doesn't exist, create it
            if (!tag) {
              const tagResult = await dbService.run('INSERT INTO tags (name) VALUES (?)', [tagName]);
              tag = { id: tagResult.lastID };
              console.log(`Created new tag "${tagName}" with ID ${tag.id}`);
            } else {
              console.log(`Using existing tag "${tagName}" with ID ${tag.id}`);
            }
            
            // Associate tag with prompt
            await dbService.run(
              'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
              [promptId, tag.id]
            );
            console.log(`Associated tag ${tag.id} with prompt ${promptId}`);
          }
        }
      } else {
        console.log(`No prompt content provided for step ${stepId}`);
      }
      
      // Return the created step with its prompt and tags
      const createdStep = await this.getStepWithPrompt(stepId);
      console.log('Step created successfully:', createdStep);
      return createdStep;
    } catch (error) {
      console.error('Error creating step:', error);
      throw error;
    }
  },
  
  // Update a step
  async updateStep(stepId, stepData) {
    try {
      if (!stepId) {
        throw new Error('Step ID is required for update');
      }
      
      if (!stepData) {
        throw new Error('No update data provided');
      }
      
      console.log(`Updating step ${stepId} with data:`, JSON.stringify(stepData, null, 2));
      
      // Update step
      await dbService.run(
        'UPDATE steps SET title = ?, description = ?, icon = ?, color = ? WHERE id = ?',
        [
          stepData.title,
          stepData.description || '',
          stepData.icon || 'Compass',
          stepData.color || '#5B8FB9',
          stepId
        ]
      );
      
      // Update prompt if available
      if (stepData.prompt) {
        // Check if prompt exists
        const prompt = await dbService.get('SELECT id FROM prompts WHERE step_id = ?', [stepId]);
        
        if (prompt) {
          console.log(`Updating existing prompt ${prompt.id} for step ${stepId}`);
          
          // Update existing prompt
          await dbService.run(
            'UPDATE prompts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [stepData.prompt.content, prompt.id]
          );
          
          // Update tags if available
          if (stepData.prompt.tags) {
            console.log(`Updating tags for prompt ${prompt.id}`);
            
            // Remove existing tag associations
            await dbService.run('DELETE FROM prompt_tags WHERE prompt_id = ?', [prompt.id]);
            
            // Add new tag associations
            for (const tagName of stepData.prompt.tags) {
              // Check if tag exists
              let tag = await dbService.get('SELECT id FROM tags WHERE name = ?', [tagName]);
              
              // If tag doesn't exist, create it
              if (!tag) {
                const tagResult = await dbService.run('INSERT INTO tags (name) VALUES (?)', [tagName]);
                tag = { id: tagResult.lastID };
                console.log(`Created new tag "${tagName}" with ID ${tag.id}`);
              }
              
              // Associate tag with prompt
              await dbService.run(
                'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
                [prompt.id, tag.id]
              );
              console.log(`Associated tag ${tag.id} with prompt ${prompt.id}`);
            }
          }
        } else {
          console.log(`Creating new prompt for step ${stepId}`);
          
          // Create new prompt
          const promptResult = await dbService.run(
            'INSERT INTO prompts (step_id, content) VALUES (?, ?)',
            [stepId, stepData.prompt.content]
          );
          
          const promptId = promptResult.lastID;
          console.log(`Created new prompt with ID ${promptId}`);
          
          // Add tags if available
          if (stepData.prompt.tags && stepData.prompt.tags.length > 0) {
            console.log(`Adding ${stepData.prompt.tags.length} tags for prompt ${promptId}`);
            
            for (const tagName of stepData.prompt.tags) {
              // Check if tag exists
              let tag = await dbService.get('SELECT id FROM tags WHERE name = ?', [tagName]);
              
              // If tag doesn't exist, create it
              if (!tag) {
                const tagResult = await dbService.run('INSERT INTO tags (name) VALUES (?)', [tagName]);
                tag = { id: tagResult.lastID };
                console.log(`Created new tag "${tagName}" with ID ${tag.id}`);
              }
              
              // Associate tag with prompt
              await dbService.run(
                'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
                [promptId, tag.id]
              );
              console.log(`Associated tag ${tag.id} with prompt ${promptId}`);
            }
          }
        }
      }
      
      // Return the updated step with its prompt and tags
      const updatedStep = await this.getStepWithPrompt(stepId);
      console.log('Step updated successfully:', updatedStep);
      return updatedStep;
    } catch (error) {
      console.error(`Error updating step with ID ${stepId}:`, error);
      throw error;
    }
  },
  
  // Delete a step
  async deleteStep(stepId) {
    try {
      if (!stepId) {
        throw new Error('Step ID is required for deletion');
      }
      
      console.log(`Deleting step ${stepId}`);
      
      // Get step to check its journey_id and position
      const step = await dbService.get('SELECT journey_id, position FROM steps WHERE id = ?', [stepId]);
      
      if (!step) {
        throw new Error(`Step with ID ${stepId} not found`);
      }
      
      // Delete step (will cascade delete prompts and tag associations)
      await dbService.run('DELETE FROM steps WHERE id = ?', [stepId]);
      console.log(`Step ${stepId} deleted`);
      
      // Update positions of remaining steps
      await dbService.run(
        'UPDATE steps SET position = position - 1 WHERE journey_id = ? AND position > ?',
        [step.journey_id, step.position]
      );
      console.log(`Updated positions for steps in journey ${step.journey_id}`);
      
      return { id: stepId, deleted: true };
    } catch (error) {
      console.error(`Error deleting step with ID ${stepId}:`, error);
      throw error;
    }
  },
  
  // Reorder steps for a journey
  async reorderSteps(journeyId, stepIds) {
    try {
      if (!journeyId) {
        throw new Error('Journey ID is required');
      }
      
      if (!stepIds || !Array.isArray(stepIds) || stepIds.length === 0) {
        throw new Error('Step IDs array is required for reordering');
      }
      
      console.log(`Reordering ${stepIds.length} steps for journey ${journeyId}`);
      
      // Update positions based on the new order
      for (let i = 0; i < stepIds.length; i++) {
        await dbService.run(
          'UPDATE steps SET position = ? WHERE id = ? AND journey_id = ?',
          [i, stepIds[i], journeyId]
        );
      }
      
      // Return the updated steps
      return this.getStepsWithPrompts(journeyId);
    } catch (error) {
      console.error(`Error reordering steps for journey ${journeyId}:`, error);
      throw error;
    }
  }
};