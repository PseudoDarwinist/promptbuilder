import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { journeyService } from '../api/services/journeyService';
import { stepService } from '../api/services/stepService';

export const useJourneyStore = create(
  immer((set, get) => ({
    // State
    journeys: [],
    currentJourney: null,
    steps: [],
    currentStepIndex: -1,
    loading: false,
    error: null,
    showPromptDetails: true,
    
    // Actions
    clearError: () => set({ error: null }),
    
    setLoading: (loading) => set({ loading }),
    
    setError: (error) => set({ error }),
    
    togglePromptDetails: () => set(state => ({ showPromptDetails: !state.showPromptDetails })),
    
    // Journey actions
    fetchJourneys: async () => {
      try {
        set({ loading: true, error: null });
        const journeys = await journeyService.getAllJourneys();
        set({ journeys, loading: false });
      } catch (error) {
        console.error("Error fetching journeys:", error);
        set({ error: error.message, loading: false });
      }
    },
    
    loadJourney: async (journeyId) => {
      try {
        set({ loading: true, error: null });
        const journey = await journeyService.getJourneyWithSteps(journeyId);
        set({ currentJourney: journey, loading: false });
        
        // Load steps with prompts
        await get().loadSteps(journeyId);
      } catch (error) {
        console.error("Error loading journey:", error);
        set({ error: error.message, loading: false });
      }
    },
    
    createJourney: async (journeyData) => {
      try {
        set({ loading: true, error: null });
        const journey = await journeyService.createJourney(journeyData);
        set(state => {
          state.journeys.push(journey);
          state.currentJourney = journey;
          state.loading = false;
        });
        return journey;
      } catch (error) {
        console.error("Error creating journey:", error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    updateJourney: async (journeyId, journeyData) => {
      try {
        set({ loading: true, error: null });
        const journey = await journeyService.updateJourney(journeyId, journeyData);
        set(state => {
          const index = state.journeys.findIndex(j => j.id === parseInt(journeyId));
          if (index !== -1) {
            state.journeys[index] = journey;
          }
          if (state.currentJourney?.id === parseInt(journeyId)) {
            state.currentJourney = journey;
          }
          state.loading = false;
        });
        return journey;
      } catch (error) {
        console.error("Error updating journey:", error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    deleteJourney: async (journeyId) => {
      try {
        set({ loading: true, error: null });
        await journeyService.deleteJourney(journeyId);
        set(state => {
          state.journeys = state.journeys.filter(j => j.id !== parseInt(journeyId));
          if (state.currentJourney?.id === parseInt(journeyId)) {
            state.currentJourney = null;
            state.steps = [];
            state.currentStepIndex = -1;
          }
          state.loading = false;
        });
      } catch (error) {
        console.error("Error deleting journey:", error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    // Step actions
    loadSteps: async (journeyId) => {
      try {
        set({ loading: true, error: null });
        const steps = await stepService.getStepsWithPrompts(journeyId);
        
        console.log(`Loaded ${steps.length} steps for journey ${journeyId} from service.`);
        
        // Ensure each step has at least an empty prompt object
        const stepsWithPrompts = steps.map(step => {
          if (!step.prompt) {
            console.log(`Step ${step.id} is missing prompt, initializing.`);
            return {
              ...step,
              prompt: { content: "", tags: [] }
            };
          }
          return step;
        });
        
        // Set steps and RESET currentStepIndex to 0, ensure loading is false
        set({
          steps: stepsWithPrompts,
          currentStepIndex: stepsWithPrompts.length > 0 ? 0 : -1,
          loading: false,
          error: null
        });

        console.log(`[Store Action] loadSteps finished set() call. Index set to: ${stepsWithPrompts.length > 0 ? 0 : -1}`);

        // Log state IMMEDIATELY after setting using get()
        const postUpdateState = get();
        console.log(`[Store Action] State immediately after set: index=${postUpdateState.currentStepIndex}, steps=${postUpdateState.steps.length}`);
        const postUpdateStep = postUpdateState.currentStep; // Explicitly call getter
        console.log(`[Store Action] currentStep from getter post-set: ${postUpdateStep ? postUpdateStep.title : 'null'}`);

        return stepsWithPrompts;
      } catch (error) {
        console.error("Error loading steps in store:", error);
        set({ error: error.message, loading: false, steps: [], currentStepIndex: -1 });
        return [];
      }
    },
    
    goToStep: (index) => {
      const { steps } = get(); // Get current steps for validation
      
      console.log(`[Store Action] goToStep: Attempting to go to index: ${index}, steps.length: ${steps.length}`);
      
      // Validate index against the current steps array length
      if (index >= 0 && index < steps.length) {
        console.log(`[Store Action] goToStep: Setting currentStepIndex to: ${index}`);
        set({ currentStepIndex: index });
        // No need to log the getter result here, let components react
      } else {
        console.warn(`[Store Action] goToStep: Invalid step index: ${index} (valid range: 0-${steps.length - 1})`);
      }
    },
    
    nextStep: () => {
      const { currentStepIndex, steps } = get();
      if (currentStepIndex < steps.length - 1) {
        set({ currentStepIndex: currentStepIndex + 1 });
      }
    },
    
    prevStep: () => {
      const { currentStepIndex } = get();
      if (currentStepIndex > 0) {
        set({ currentStepIndex: currentStepIndex - 1 });
      }
    },
    
    createStep: async (stepData) => {
      try {
        set({ loading: true, error: null });
        const step = await stepService.createStep(stepData);
        
        set(state => {
          // Add the new step to the steps array
          state.steps.push(step);
          // Set the current step index to the new step (which is the last one)
          state.currentStepIndex = state.steps.length - 1;
          state.loading = false;
        });
        
        // Log after updating state
        console.log(`Step created and set as current step:`, step);
        return step;
      } catch (error) {
        console.error("Error creating step:", error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    updateStep: async (stepId, stepData) => {
      try {
        set({ loading: true, error: null });
        const updatedStep = await stepService.updateStep(stepId, stepData);
        set(state => {
          const index = state.steps.findIndex(s => s.id === parseInt(stepId));
          if (index !== -1) {
            state.steps[index] = updatedStep;
          }
          state.loading = false;
        });
        return updatedStep;
      } catch (error) {
        console.error("Error updating step:", error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    deleteStep: async (stepId) => {
      try {
        set({ loading: true, error: null });
        await stepService.deleteStep(stepId);
        set(state => {
          state.steps = state.steps.filter(s => s.id !== parseInt(stepId));
          state.loading = false;
          if (state.currentStepIndex >= state.steps.length) {
            state.currentStepIndex = Math.max(0, state.steps.length - 1);
          }
        });
      } catch (error) {
        console.error("Error deleting step:", error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    reorderSteps: async (stepIds) => {
      try {
        const { currentJourney } = get();
        if (!currentJourney) return;
        
        set({ loading: true, error: null });
        const steps = await stepService.reorderSteps(currentJourney.id, stepIds);
        set({ steps, loading: false });
      } catch (error) {
        console.error("Error reordering steps:", error);
        set({ error: error.message, loading: false });
        throw error;
      }
    }
  }))
);