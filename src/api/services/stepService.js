// Mock data for steps with prompts
const mockSteps = [
  {
    id: 1,
    journey_id: 1,
    title: "Introduction to Prompts",
    description: "Learn the basics of prompt engineering",
    icon: "BookOpen",
    color: "#4CAF50",
    position: 0,
    prompt: {
      id: 1,
      step_id: 1,
      content: "This is an example prompt template for introduction",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [
        { id: 1, name: "beginner" },
        { id: 2, name: "introduction" }
      ]
    }
  },
  {
    id: 2,
    journey_id: 1,
    title: "Basic Prompt Templates",
    description: "Create your first prompt templates",
    icon: "FileText",
    color: "#2196F3",
    position: 1,
    prompt: {
      id: 2,
      step_id: 2,
      content: "This is a template for creating basic prompts",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [
        { id: 1, name: "beginner" },
        { id: 3, name: "template" }
      ]
    }
  },
  {
    id: 3,
    journey_id: 2,
    title: "Chain of Thought",
    description: "Learn advanced chain of thought techniques",
    icon: "Lightbulb",
    color: "#FF9800",
    position: 0,
    prompt: {
      id: 3,
      step_id: 3,
      content: "This is a chain of thought prompt example",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [
        { id: 4, name: "advanced" },
        { id: 5, name: "reasoning" }
      ]
    }
  },
  {
    id: 4,
    journey_id: 2,
    title: "Few-Shot Learning",
    description: "Use examples to improve AI responses",
    icon: "Target",
    color: "#9C27B0",
    position: 1,
    prompt: {
      id: 4,
      step_id: 4,
      content: "This is a few-shot learning prompt example",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [
        { id: 4, name: "advanced" },
        { id: 6, name: "examples" }
      ]
    }
  }
];

export const stepService = {
  // Get a step with its prompt
  async getStepWithPrompt(stepId) {
    const step = mockSteps.find(s => s.id === parseInt(stepId));
    
    if (!step) {
      throw new Error(`Step with ID ${stepId} not found`);
    }
    
    return Promise.resolve({...step});
  },
  
  // Get all steps for a journey with their prompts
  async getStepsWithPrompts(journeyId) {
    const steps = mockSteps.filter(s => s.journey_id === parseInt(journeyId))
      .sort((a, b) => a.position - b.position);
    
    return Promise.resolve(JSON.parse(JSON.stringify(steps)));
  },
  
  // Create a new step
  async createStep(stepData) {
    const position = mockSteps
      .filter(s => s.journey_id === stepData.journey_id)
      .reduce((max, s) => Math.max(max, s.position + 1), 0);
    
    const newStep = {
      id: Math.max(...mockSteps.map(s => s.id)) + 1,
      journey_id: stepData.journey_id,
      title: stepData.title,
      description: stepData.description,
      icon: stepData.icon,
      color: stepData.color,
      position,
      prompt: stepData.prompt ? {
        id: Math.max(...mockSteps.filter(s => s.prompt).map(s => s.prompt.id)) + 1,
        step_id: Math.max(...mockSteps.map(s => s.id)) + 1,
        content: stepData.prompt.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: (stepData.prompt.tags || []).map((tag, i) => ({
          id: i + 1,
          name: tag
        }))
      } : null
    };
    
    mockSteps.push(newStep);
    return Promise.resolve({...newStep});
  },
  
  // Update a step
  async updateStep(stepId, stepData) {
    const stepIndex = mockSteps.findIndex(s => s.id === parseInt(stepId));
    
    if (stepIndex === -1) {
      throw new Error(`Step with ID ${stepId} not found`);
    }
    
    const updatedStep = {
      ...mockSteps[stepIndex],
      title: stepData.title || mockSteps[stepIndex].title,
      description: stepData.description || mockSteps[stepIndex].description,
      icon: stepData.icon || mockSteps[stepIndex].icon,
      color: stepData.color || mockSteps[stepIndex].color
    };
    
    if (stepData.prompt) {
      if (updatedStep.prompt) {
        updatedStep.prompt = {
          ...updatedStep.prompt,
          content: stepData.prompt.content,
          updated_at: new Date().toISOString()
        };
        
        if (stepData.prompt.tags) {
          updatedStep.prompt.tags = stepData.prompt.tags.map((tag, i) => ({
            id: i + 1,
            name: tag
          }));
        }
      } else {
        updatedStep.prompt = {
          id: Math.max(...mockSteps.filter(s => s.prompt).map(s => s.prompt.id)) + 1,
          step_id: parseInt(stepId),
          content: stepData.prompt.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: (stepData.prompt.tags || []).map((tag, i) => ({
            id: i + 1,
            name: tag
          }))
        };
      }
    }
    
    mockSteps[stepIndex] = updatedStep;
    return Promise.resolve({...updatedStep});
  },
  
  // Delete a step
  async deleteStep(stepId) {
    const stepIndex = mockSteps.findIndex(s => s.id === parseInt(stepId));
    
    if (stepIndex !== -1) {
      mockSteps.splice(stepIndex, 1);
    }
    
    return Promise.resolve({ id: stepId, deleted: true });
  },
  
  // Reorder steps for a journey
  async reorderSteps(journeyId, stepIds) {
    const journeySteps = mockSteps.filter(s => s.journey_id === parseInt(journeyId));
    
    stepIds.forEach((stepId, index) => {
      const step = mockSteps.find(s => s.id === parseInt(stepId));
      if (step) {
        step.position = index;
      }
    });
    
    return Promise.resolve(
      mockSteps
        .filter(s => s.journey_id === parseInt(journeyId))
        .sort((a, b) => a.position - b.position)
    );
  }
};