import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import NarrativeLayout from '../components/narrative-ui/NarrativeLayout';
import JourneyProgressBar from '../components/narrative-ui/JourneyProgressBar';
import JourneyTimeline from '../components/narrative-ui/JourneyTimeline';
import StageContent from '../components/narrative-ui/StageContent';
import Modal from '../components/common/Modal';
import StepForm from '../components/forms/StepForm';
import Button from '../components/common/Button';
import { useJourneyStore } from '../hooks/useJourneyStore';
import Spinner from '../components/common/Spinner';
import { Plus, Settings } from 'lucide-react';
import { colors } from '../constants/colors';

const NarrativeJourneyPage = () => {
  const { journeyId } = useParams();
  const { 
    currentStep, 
    currentJourney, 
    steps, 
    loading, 
    loadJourney, 
    loadSteps,
    createStep,
    updateStep,
    deleteStep 
  } = useJourneyStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stepToEdit, setStepToEdit] = useState(null);
  const [stepToDelete, setStepToDelete] = useState(null);
  
  useEffect(() => {
    if (journeyId) {
      loadJourney(journeyId);
    }
  }, [journeyId, loadJourney]);
  
  useEffect(() => {
    if (currentJourney?.id) {
      loadSteps(currentJourney.id);
    }
  }, [currentJourney?.id, loadSteps]);
  
  const handleCreateStep = async (stepData) => {
    await createStep(stepData);
    setShowCreateModal(false);
  };
  
  const handleUpdateStep = async (stepData) => {
    await updateStep(stepToEdit.id, stepData);
    setShowEditModal(false);
    setStepToEdit(null);
  };
  
  const handleDeleteStep = async () => {
    await deleteStep(stepToDelete.id);
    setShowDeleteModal(false);
    setStepToDelete(null);
  };
  
  const openEditModal = (step) => {
    setStepToEdit(step);
    setShowEditModal(true);
  };
  
  const openDeleteModal = (step) => {
    setStepToDelete(step);
    setShowDeleteModal(true);
  };
  
  if (loading && !currentStep) {
    return (
      <NarrativeLayout>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </NarrativeLayout>
    );
  }
  
  return (
    <NarrativeLayout>
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold" style={{ color: currentStep?.color || colors.terracotta }}>
          {currentStep?.title || "Welcome to your journey"}
        </h2>
        <div className="flex items-center space-x-3">
          <Button 
            variant="secondary"
            icon={<Settings size={16} />}
            onClick={() => setShowManageModal(true)}
          >
            Manage Steps
          </Button>
          <Button 
            variant="primary"
            icon={<Plus size={16} />}
            style={{ backgroundColor: colors.sage }}
            onClick={() => setShowCreateModal(true)}
          >
            Add Step
          </Button>
        </div>
      </div>
      
      {/* Progress info */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2 text-sm text-darkBrown">
          <span>Journey:</span>
          <span className="font-medium">{currentJourney?.name}</span>
        </div>
        <span className="text-sm font-medium text-darkBrown">
          Chapter {useJourneyStore.getState().currentStepIndex + 1} of {steps.length}
        </span>
      </div>
      
      {/* Progress bar */}
      <JourneyProgressBar />
      
      {steps.length > 0 ? (
        <>
          {/* Timeline visualization */}
          <div className="mt-8">
            <JourneyTimeline />
          </div>
          
          {/* Current stage content */}
          <StageContent />
        </>
      ) : (
        <div className="mt-12 text-center py-16 bg-white rounded-xl shadow-card">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-beige flex items-center justify-center">
            <Plus size={28} color={colors.darkBrown} />
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-2">No Steps Yet</h3>
          <p className="text-darkBrown mb-6 max-w-md mx-auto">
            Start building your journey by adding your first step. Each step represents a stage in your prompt flow.
          </p>
          <Button 
            variant="primary" 
            icon={<Plus size={18} />} 
            style={{ backgroundColor: colors.terracotta }}
            onClick={() => setShowCreateModal(true)}
          >
            Add Your First Step
          </Button>
        </div>
      )}
      
      {/* Create Step Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Step"
      >
        <StepForm 
          journeyId={currentJourney?.id}
          onSubmit={handleCreateStep} 
          onCancel={() => setShowCreateModal(false)} 
        />
      </Modal>
      
      {/* Edit Step Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Step"
      >
        {stepToEdit && (
          <StepForm 
            initialData={stepToEdit}
            journeyId={currentJourney?.id}
            onSubmit={handleUpdateStep} 
            onCancel={() => setShowEditModal(false)} 
          />
        )}
      </Modal>
      
      {/* Manage Steps Modal */}
      <Modal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Manage Journey Steps"
      >
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Step Order</h3>
            <p className="text-sm text-darkBrown mb-4">
              Drag and drop to reorder steps in your journey.
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {steps.map((step, index) => (
                <div 
                  key={step.id}
                  className="bg-offWhite p-3 rounded-lg flex items-center"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 text-white text-sm"
                       style={{ backgroundColor: step.color }}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-charcoal">{step.title}</h4>
                    <p className="text-xs text-darkBrown">{step.description}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      className="p-2 rounded-lg text-darkBrown hover:bg-beige transition-colors"
                      onClick={() => openEditModal(step)}
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      className="p-2 rounded-lg text-red-500 hover:bg-beige transition-colors"
                      onClick={() => openDeleteModal(step)}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="primary"
              style={{ backgroundColor: colors.sage }}
              onClick={() => setShowManageModal(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Step"
        size="sm"
      >
        <div className="p-6">
          <p className="mb-6">
            Are you sure you want to delete the step "{stepToDelete?.title}"? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button 
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              style={{ backgroundColor: '#EF4444' }}
              onClick={handleDeleteStep}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </NarrativeLayout>
  );
};

export default NarrativeJourneyPage;