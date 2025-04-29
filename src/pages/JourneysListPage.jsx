import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useJourneyStore } from '../hooks/useJourneyStore';
import { Sparkles, Plus, Trash, Edit, Clipboard } from 'lucide-react';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import Modal from '../components/common/Modal';
import JourneyForm from '../components/forms/JourneyForm';
import { colors } from '../constants/colors';
import * as LucideIcons from 'lucide-react';

// Define glow colors inspired by the example
const glowColors = [
  '#FF6B6B', // Pinkish-Red
  '#4ECDC4', // Tealish-Blue
  '#FFA07A', // Light Salmon/Orange
  '#9381FF', // Lavender (from existing palette)
];

const JourneysListPage = () => {
  const { 
    journeys, 
    loading, 
    fetchJourneys,
    createJourney,
    updateJourney,
    deleteJourney 
  } = useJourneyStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentJourney, setCurrentJourney] = useState(null);
  
  useEffect(() => {
    fetchJourneys();
  }, [fetchJourneys]);
  
  const handleCreateJourney = async (journeyData) => {
    await createJourney(journeyData);
    setShowCreateModal(false);
  };
  
  const handleUpdateJourney = async (journeyData) => {
    await updateJourney(currentJourney.id, journeyData);
    setShowEditModal(false);
    setCurrentJourney(null);
  };
  
  const handleDeleteJourney = async () => {
    await deleteJourney(currentJourney.id);
    setShowDeleteModal(false);
    setCurrentJourney(null);
  };
  
  const openEditModal = (journey) => {
    setCurrentJourney(journey);
    setShowEditModal(true);
  };
  
  const openDeleteModal = (journey) => {
    setCurrentJourney(journey);
    setShowDeleteModal(true);
  };
  
  const renderIcon = (iconName) => {
    const Icon = LucideIcons[iconName] || LucideIcons.Circle;
    return <Icon size={24} />;
  };
  
  return (
    <div className="min-h-screen bg-offWhite p-8">
      <header className="mb-8">
        <div className="flex items-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
            style={{ backgroundColor: colors.sage }}
          >
            <Sparkles size={24} color="white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-charcoal">PromptFlow</h1>
            <p className="text-darkBrown">Your prompt journey library</p>
          </div>
        </div>
      </header>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-charcoal">Your Journeys</h2>
        <Button 
          variant="primary" 
          icon={<Plus size={18} />} 
          style={{ backgroundColor: colors.terracotta }}
          onClick={() => setShowCreateModal(true)}
        >
          Create New Journey
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {journeys.map((journey, index) => {
            // Calculate glow color based on index
            const glowColor = glowColors[index % glowColors.length];
            
            return (
              <div 
                key={journey.id} 
                className="bg-white rounded-xl shadow-card hover:shadow-lg transition-all duration-300 overflow-hidden"
                style={{ 
                  boxShadow: `0 0 15px 3px ${glowColor}, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`,
                }}
              >
                <div className="p-6">
                  <div className="flex items-start">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center mr-4"
                      style={{ backgroundColor: colors.sage + '20' }}
                    >
                      {renderIcon(journey.icon)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-charcoal mb-2">{journey.name}</h3>
                      <p className="text-sm text-darkBrown mb-4">{journey.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-darkBrown">
                          Created: {new Date(journey.created_at).toLocaleDateString()}
                        </span>
                        <div 
                          className="rounded-full px-3 py-1 text-xs"
                          style={{ backgroundColor: colors.beige }}
                        >
                          {journey.stepCount ?? 0} steps
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-beige p-3 bg-offWhite bg-opacity-50 flex">
                  <Link 
                    to={`/journey/${journey.id}`}
                    className="flex-1 py-2 px-3 rounded-lg text-center text-sm font-medium text-darkBrown hover:bg-beige transition-colors"
                  >
                    Open Journey
                  </Link>
                  <button
                    onClick={() => openEditModal(journey)}
                    className="ml-2 p-2 rounded-lg text-darkBrown hover:bg-beige transition-colors"
                    aria-label="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(journey)}
                    className="ml-2 p-2 rounded-lg text-darkBrown hover:bg-beige transition-colors"
                    aria-label="Delete"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          
          {journeys.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-card">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-beige flex items-center justify-center">
                <Clipboard size={28} color={colors.darkBrown} />
              </div>
              <p className="text-darkBrown mb-4">You don't have any journeys yet.</p>
              <Button 
                variant="primary" 
                icon={<Plus size={18} />} 
                style={{ backgroundColor: colors.terracotta }}
                onClick={() => setShowCreateModal(true)}
              >
                Create Your First Journey
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Create Journey Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Journey"
      >
        <JourneyForm 
          onSubmit={handleCreateJourney} 
          onCancel={() => setShowCreateModal(false)} 
        />
      </Modal>
      
      {/* Edit Journey Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Journey"
      >
        {currentJourney && (
          <JourneyForm 
            initialData={currentJourney}
            onSubmit={handleUpdateJourney} 
            onCancel={() => setShowEditModal(false)} 
          />
        )}
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Journey"
        size="sm"
      >
        <div className="p-6">
          <p className="mb-6">
            Are you sure you want to delete the journey "{currentJourney?.name}"? 
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
              onClick={handleDeleteJourney}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default JourneysListPage;