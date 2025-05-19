import dbService from '../db/database-service';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
import { stepService } from './stepService'; // Import stepService

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
  
  // Get journey by ID with steps (including prompts, tags, and attachments)
  async getJourneyWithSteps(journeyId) {
    try {
      const journey = await dbService.get('SELECT *, is_shared, share_id FROM journeys WHERE id = ?', [journeyId]);
    
      if (!journey) {
        console.warn(`[Service] Journey with ID ${journeyId} not found.`);
        return null;
      }
    
      // Use stepService to get steps with full details (prompts, tags, attachments)
      console.log(`[Service] Calling stepService.getStepsWithPrompts for journey ID: ${journeyId}`);
      const steps = await stepService.getStepsWithPrompts(journeyId);
      
      console.log(`[Service] Fetched journey ${journeyId} with ${steps.length} full steps.`);
      return { ...journey, steps };
    } catch (error) {
      console.error(`Error fetching journey with ID ${journeyId}:`, error);
      throw error;
    }
  },
  
  // Get public journey by share_id (include prompt tags AND attachments)
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

      // Use stepService to get steps with full details (prompts, tags, attachments)
      console.log(`[Service] Calling stepService.getStepsWithPrompts for shared journey ID: ${journey.id}`);
      const steps = await stepService.getStepsWithPrompts(journey.id);
      
      console.log(`[Service] Fetched shared journey ${journey.id} via share_id ${shareId} with ${steps.length} full steps.`);
      return { ...journey, steps };

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