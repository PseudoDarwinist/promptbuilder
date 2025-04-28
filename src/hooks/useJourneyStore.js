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
    currentStepIndex: 0,
    loading: false,
    error: null,
    showPromptDetails: true,
    
    // Computed values
    get currentStep() {
      const { steps, currentStepIndex } = get();
      return steps.length > 0 ? steps[currentStepIndex] : null;
    },
    
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
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    updateJourney: async (journeyId, journeyData) => {
      try {
        set({ loading: true, error: null });
        const journey = await journeyService.updateJourney(journeyId, journeyData);
        set(state => {
          const index = state.journeys.findIndex(j => j.id === journeyId);
          if (index !== -1) {
            state.journeys[index] = journey;
          }
          if (state.currentJourney?.id === journeyId) {
            state.currentJourney = journey;
          }
          state.loading = false;
        });
        return journey;
      } catch (error) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    deleteJourney: async (journeyId) => {
      try {
        set({ loading: true, error: null });
        await journeyService.deleteJourney(journeyId);
        set(state => {
          state.journeys = state.journeys.filter(j => j.id !== journeyId);
          if (state.currentJourney?.id === journeyId) {
            state.currentJourney = null;
            state.steps = [];
            state.currentStepIndex = 0;
          }
          state.loading = false;
        });
      } catch (error) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    // Step actions
    loadSteps: async (journeyId) => {
      try {
        set({ loading: true, error: null });
        const steps = await stepService.getStepsWithPrompts(journeyId);
        set({ 
          steps,
          currentStepIndex: 0,
          loading: false 
        });
      } catch (error) {
        set({ error: error.message, loading: false });
      }
    },
    
    goToStep: (index) => {
      const { steps } = get();
      if (index >= 0 && index < steps.length) {
        set({ currentStepIndex: index });
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
          state.steps.push(step);
          state.loading = false;
        });
        return step;
      } catch (error) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    updateStep: async (stepId, stepData) => {
      try {
        set({ loading: true, error: null });
        const updatedStep = await stepService.updateStep(stepId, stepData);
        set(state => {
          const index = state.steps.findIndex(s => s.id === stepId);
          if (index !== -1) {
            state.steps[index] = updatedStep;
          }
          state.loading = false;
        });
        return updatedStep;
      } catch (error) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },
    
    deleteStep: async (stepId) => {
      try {
        set({ loading: true, error: null });
        await stepService.deleteStep(stepId);
        set(state => {
          state.steps = state.steps.filter(s => s.id !== stepId);
          state.loading = false;
        });
      } catch (error) {
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
        set({ error: error.message, loading: false });
        throw error;
      }
    }
  }))
);