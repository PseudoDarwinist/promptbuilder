import dbService from '../db/database-service';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

export const journeyService = {
  // Get all journeys
  async getAllJourneys() {
    try {
      // Fetch all base journey data
      const journeys = await dbService.all('SELECT * FROM journeys ORDER BY created_at DESC');
      
      // Fetch step counts for each journey
      const journeysWithCounts = await Promise.all(journeys.map(async (journey) => {
        const countResult = await dbService.get(
          'SELECT COUNT(*) as stepCount FROM steps WHERE journey_id = ?',
          [journey.id]
        );
        return {
          ...journey,
          stepCount: countResult ? countResult.stepCount : 0
        };
      }));
      
      console.log(`[Service] Fetched ${journeysWithCounts.length} journeys with step counts.`);
      return journeysWithCounts;
      
    } catch (error) {
      console.error('Error fetching all journeys with counts:', error);
      throw error;
    }
  },
  
  // Get journey by ID with steps (include sharing info AND prompt tags)
  async getJourneyWithSteps(journeyId) {
    try {
      const journey = await dbService.get('SELECT *, is_shared, share_id FROM journeys WHERE id = ?', [journeyId]);
    
      if (!journey) {
        console.warn(`[Service] Journey with ID ${journeyId} not found.`);
        // Return null or a specific error object instead of throwing?
        return null; // Modified to return null for clearer handling in frontend
        // throw new Error(`Journey with ID ${journeyId} not found`);
      }
    
      const steps = await dbService.all(
        'SELECT * FROM steps WHERE journey_id = ? ORDER BY position ASC',
        [journeyId]
      );
      
      // Fetch prompt content AND tags for each step
      const stepsWithFullPrompts = await Promise.all(steps.map(async (step) => {
        let prompt = await dbService.get('SELECT * FROM prompts WHERE step_id = ?', [step.id]);
        if (prompt) {
          // Fetch tags for this prompt if it exists
          console.log(`[Service] Fetching tags for prompt ID: ${prompt.id}`);
          const tags = await dbService.all('SELECT t.id, t.name FROM tags t JOIN prompt_tags pt ON t.id = pt.tag_id WHERE pt.prompt_id = ?', [prompt.id]);
          console.log(`[Service] Fetched tags for prompt ${prompt.id}:`, tags);
          prompt = { ...prompt, tags: tags || [] }; // Add tags array to prompt object
        } else {
          console.log(`[Service] No prompt found for step ID: ${step.id}, setting empty prompt object.`);
          // Ensure prompt is at least an empty object if null/undefined
          prompt = { content: '', tags: [] };
        }
        console.log(`[Service] Final prompt object for step ${step.id}:`, JSON.stringify(prompt));
        return { ...step, prompt };
      }));
      
      console.log(`[Service] Fetched journey ${journeyId} with ${stepsWithFullPrompts.length} steps, prompts, and tags.`);
      return { ...journey, steps: stepsWithFullPrompts };
    } catch (error) {
      console.error(`Error fetching journey with ID ${journeyId}:`, error);
      throw error;
    }
  },
  
  // Get public journey by share_id (include prompt tags)
  async getJourneyByShareId(shareId) {
    try {
      const journey = await dbService.get(
        'SELECT * FROM journeys WHERE share_id = ? AND is_shared = 1',
        [shareId]
      );

      if (!journey) {
        console.warn(`[Service] Shared journey with share_id ${shareId} not found or not shared.`);
        return null; 
      }

      // Fetch steps and prompts for the shared journey (similar to getJourneyWithSteps)
      const steps = await dbService.all(
        'SELECT * FROM steps WHERE journey_id = ? ORDER BY position ASC',
        [journey.id]
      );
      const stepsWithFullPrompts = await Promise.all(steps.map(async (step) => {
        let prompt = await dbService.get('SELECT * FROM prompts WHERE step_id = ?', [step.id]);
        if (prompt) {
          // Fetch tags for this prompt
          console.log(`[Service] Fetching tags for prompt ID: ${prompt.id}`);
          const tags = await dbService.all('SELECT t.id, t.name FROM tags t JOIN prompt_tags pt ON t.id = pt.tag_id WHERE pt.prompt_id = ?', [prompt.id]);
          console.log(`[Service] Fetched tags for prompt ${prompt.id}:`, tags);
          prompt = { ...prompt, tags: tags || [] };
        } else {
          console.log(`[Service] No prompt found for step ID: ${step.id}, setting empty prompt object.`);
          prompt = { content: '', tags: [] };
        }
        console.log(`[Service] Final prompt object for step ${step.id}:`, JSON.stringify(prompt));
        return { ...step, prompt };
      }));
      
      console.log(`[Service] Fetched shared journey ${journey.id} via share_id ${shareId} with prompts and tags.`);
      return { ...journey, steps: stepsWithFullPrompts };

    } catch (error) {
      console.error(`Error fetching journey by share_id ${shareId}:`, error);
      throw error;
    }
  },
  
  // Create a new journey
  async createJourney(journeyData) {
    try {
      // Insert journey
      const result = await dbService.run(
      'INSERT INTO journeys (name, description, icon) VALUES (?, ?, ?)',
      [journeyData.name, journeyData.description, journeyData.icon]
    );
    
      // Return the created journey
    return this.getJourneyWithSteps(result.lastID);
    } catch (error) {
      console.error('Error creating journey:', error);
      throw error;
    }
  },
  
  // Update a journey
  async updateJourney(journeyId, journeyData) {
    try {
      // Update journey
      await dbService.run(
      'UPDATE journeys SET name = ?, description = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [journeyData.name, journeyData.description, journeyData.icon, journeyId]
    );
    
      // Return the updated journey
    return this.getJourneyWithSteps(journeyId);
    } catch (error) {
      console.error(`Error updating journey with ID ${journeyId}:`, error);
      throw error;
    }
  },
  
  // Enable sharing for a journey
  async enableSharing(journeyId) {
    try {
      const newShareId = uuidv4(); // Generate a unique ID
      // Call the dedicated dbService function
      const result = await dbService.setJourneySharing(journeyId, true, newShareId);
      console.log(`[Service] enableSharing result for journey ${journeyId}:`, result);
      if (result.changes === 0) {
        throw new Error('Journey not found or update failed');
      }
      return { journeyId, is_shared: 1, share_id: newShareId }; // Return status
    } catch (error) {
      console.error(`Error enabling sharing for journey ${journeyId}:`, error);
      throw error; // Re-throw to be caught by the store
    }
  },

  // Disable sharing for a journey
  async disableSharing(journeyId) {
    try {
      // Call the dedicated dbService function
      const result = await dbService.setJourneySharing(journeyId, false);
      console.log(`[Service] disableSharing result for journey ${journeyId}:`, result);
      if (result.changes === 0) {
        throw new Error('Journey not found or update failed');
      }
      return { journeyId, is_shared: 0, share_id: null }; // Return status
    } catch (error) {
      console.error(`Error disabling sharing for journey ${journeyId}:`, error);
      throw error; // Re-throw to be caught by the store
    }
  },
  
  // Delete a journey
  async deleteJourney(journeyId) {
    try {
      // Delete journey
      await dbService.run('DELETE FROM journeys WHERE id = ?', [journeyId]);
    
    return { id: journeyId, deleted: true };
    } catch (error) {
      console.error(`Error deleting journey with ID ${journeyId}:`, error);
      throw error;
    }
  }
};