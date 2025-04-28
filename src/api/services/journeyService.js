// Mock data for journeys
const mockJourneys = [
  {
    id: 1,
    name: "Getting Started with AI Prompts",
    description: "A beginner's journey to effective prompt engineering",
    icon: "Sparkles",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [
      { id: 1, journey_id: 1, position: 1, title: "Introduction to Prompts" },
      { id: 2, journey_id: 1, position: 2, title: "Basic Prompt Templates" }
    ]
  },
  {
    id: 2,
    name: "Advanced Prompt Techniques",
    description: "Take your prompts to the next level",
    icon: "Zap",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [
      { id: 3, journey_id: 2, position: 1, title: "Chain of Thought" },
      { id: 4, journey_id: 2, position: 2, title: "Few-Shot Learning" }
    ]
  }
];

export const journeyService = {
  // Get all journeys
  async getAllJourneys() {
    return Promise.resolve([...mockJourneys]);
  },
  
  // Get journey by ID with steps
  async getJourneyWithSteps(journeyId) {
    const journey = mockJourneys.find(j => j.id === parseInt(journeyId));
    
    if (!journey) {
      throw new Error(`Journey with ID ${journeyId} not found`);
    }
    
    return Promise.resolve({...journey});
  },
  
  // Create a new journey
  async createJourney(journeyData) {
    const newJourney = {
      id: mockJourneys.length + 1,
      ...journeyData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      steps: []
    };
    
    mockJourneys.push(newJourney);
    return Promise.resolve({...newJourney});
  },
  
  // Update a journey
  async updateJourney(journeyId, journeyData) {
    const journeyIndex = mockJourneys.findIndex(j => j.id === parseInt(journeyId));
    
    if (journeyIndex === -1) {
      throw new Error(`Journey with ID ${journeyId} not found`);
    }
    
    const updatedJourney = {
      ...mockJourneys[journeyIndex],
      ...journeyData,
      updated_at: new Date().toISOString()
    };
    
    mockJourneys[journeyIndex] = updatedJourney;
    return Promise.resolve({...updatedJourney});
  },
  
  // Delete a journey
  async deleteJourney(journeyId) {
    const journeyIndex = mockJourneys.findIndex(j => j.id === parseInt(journeyId));
    
    if (journeyIndex !== -1) {
      mockJourneys.splice(journeyIndex, 1);
    }
    
    return Promise.resolve({ id: journeyId, deleted: true });
  }
};