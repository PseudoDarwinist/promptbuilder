import dbService from '../db/database-service';

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
  
  // Get journey by ID with steps
  async getJourneyWithSteps(journeyId) {
    try {
    // Get journey
      const journey = await dbService.get('SELECT * FROM journeys WHERE id = ?', [journeyId]);
    
    if (!journey) {
      throw new Error(`Journey with ID ${journeyId} not found`);
    }
    
    // Get steps for journey
      const steps = await dbService.all(
      'SELECT * FROM steps WHERE journey_id = ? ORDER BY position ASC',
        [journeyId]
    );
    
    return { ...journey, steps };
    } catch (error) {
      console.error(`Error fetching journey with ID ${journeyId}:`, error);
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