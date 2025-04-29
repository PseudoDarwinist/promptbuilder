
import React, { useState } from 'react';
import { Map, Compass, BookOpen, Feather, MessageSquare, Sparkles, Play, ChevronLeft, ChevronRight, Info, Settings } from 'lucide-react';

const PremiumNarrativeUI = () => {
  const [currentStage, setCurrentStage] = useState(0);
  const [showPromptDetails, setShowPromptDetails] = useState(true);
  
  // Color palette derived from the image
  const colors = {
    sage: '#7A8B69',       // Muted green
    terracotta: '#E07A5F', // Coral/orange
    beige: '#F2E9D8',      // Cream/beige
    lavender: '#9381FF',   // Light purple
    brown: '#C68B59',      // Warm brown
    darkBrown: '#6D534B',  // Darker brown
    offWhite: '#F9F5F0',   // Off-white for backgrounds
    charcoal: '#3A3A3A'    // Dark gray for text
  };
  
  // Narrative journey for software development
  const journey = [
    {
      id: 'quest',
      title: 'The Quest Begins',
      description: 'Define what we seek to build',
      prompt: "I need a detailed specification for this project. Please help me capture the essence of what we're building by addressing:\n\n1. The core problem we're solving\n2. Who we're solving it for\n3. What success looks like\n4. Key features required\n5. Technical constraints to consider",
      icon: <Compass size={24} />,
      color: colors.terracotta
    },
    {
      id: 'map',
      title: 'Mapping the Territory',
      description: 'Create the business requirements',
      prompt: "Based on our initial specification, please draft a formal Business Requirements Document (BRD) that includes:\n\n1. Project background and business need\n2. Stakeholder identification\n3. Success criteria and metrics\n4. Budget and timeline constraints\n5. Risk assessment",
      icon: <Map size={24} />,
      color: colors.sage
    },
    {
      id: 'blueprint',
      title: 'The Blueprint',
      description: 'Develop product requirements',
      prompt: "Using the business requirements, create a detailed Product Requirements Document (PRD) that includes:\n\n1. Detailed feature specifications\n2. User workflows and journeys\n3. Technical specifications\n4. Integration requirements\n5. Performance criteria\n6. Testing requirements",
      icon: <BookOpen size={24} />,
      color: colors.lavender
    },
    {
      id: 'crafting',
      title: 'Crafting the Vision',
      description: 'Design the application',
      prompt: "Based on our product requirements document, please help me design this application by providing:\n\n1. User interface mockups for key screens\n2. Information architecture\n3. Design system recommendations\n4. User flow diagrams\n5. Interactive prototype specifications",
      icon: <Feather size={24} />,
      color: colors.brown
    },
    {
      id: 'tales',
      title: 'Tales of the Users',
      description: 'Create user stories',
      prompt: "With our design approach established, please convert our requirements into Agile user stories following this format:\n\nAs a [type of user], I want [an action] so that [a benefit/value].\n\nEnsure each story is:\n1. Independent\n2. Negotiable\n3. Valuable\n4. Estimable\n5. Small\n6. Testable",
      icon: <MessageSquare size={24} />,
      color: colors.terracotta
    }
  ];

  const nextStage = () => {
    if (currentStage < journey.length - 1) {
      setCurrentStage(currentStage + 1);
    }
  };

  const prevStage = () => {
    if (currentStage > 0) {
      setCurrentStage(currentStage - 1);
    }
  };

  const togglePromptDetails = () => {
    setShowPromptDetails(!showPromptDetails);
  };

  return (
    <div className="h-screen" style={{ backgroundColor: colors.offWhite, color: colors.charcoal, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top navigation bar */}
      <header className="px-8 py-6 flex justify-between items-center" style={{ borderBottom: `1px solid ${colors.beige}` }}>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.sage }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: colors.charcoal }}>PromptFlow</h1>
            <p className="text-sm" style={{ color: colors.darkBrown }}>The Journey of Building an App</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button className="p-2 rounded-full transition-colors duration-200 hover:bg-black hover:bg-opacity-5">
            <Info size={20} style={{ color: colors.darkBrown }} />
          </button>
          <button className="p-2 rounded-full transition-colors duration-200 hover:bg-black hover:bg-opacity-5">
            <Settings size={20} style={{ color: colors.darkBrown }} />
          </button>
          <div className="ml-2 w-8 h-8 rounded-full bg-gradient-to-br from-sage to-terracotta flex items-center justify-center text-white font-medium text-sm">
            JS
          </div>
        </div>
      </header>

      <main className="px-8 py-6">
        {/* Progress bar and journey title */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold" style={{ color: journey[currentStage].color }}>
              {journey[currentStage].title}
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium" style={{ color: colors.darkBrown }}>
                Chapter {currentStage + 1} of {journey.length}
              </span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500 ease-out"
              style={{ 
                width: `${((currentStage + 1) / journey.length) * 100}%`,
                backgroundColor: journey[currentStage].color 
              }}
            ></div>
          </div>
        </div>
        
        {/* Journey visualization */}
        <div className="mb-10 relative px-12">
          {/* Journey path line */}
          <div className="absolute left-0 right-0 h-0.5 top-12 -z-10" style={{ backgroundColor: `${colors.beige}` }}></div>
          
          {/* Journey nodes */}
          <div className="flex justify-between">
            {journey.map((stage, index) => {
              // Calculate if this stage is active, completed, or upcoming
              const isActive = index === currentStage;
              const isCompleted = index < currentStage;
              const isUpcoming = index > currentStage;
              
              return (
                <div key={stage.id} className="flex flex-col items-center">
                  {/* Node */}
                  <button
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 mb-3 ${
                      isActive ? 'shadow-lg' : isCompleted ? 'opacity-90' : 'opacity-60'
                    }`}
                    style={{ 
                      backgroundColor: isActive || isCompleted ? stage.color : colors.beige,
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      border: isActive ? `4px solid ${colors.offWhite}` : 'none'
                    }}
                    onClick={() => setCurrentStage(index)}
                    aria-label={`Go to ${stage.title} stage`}
                  >
                    <div className="text-white">
                      {stage.icon}
                    </div>
                  </button>
                  
                  {/* Stage label */}
                  <div className={`text-center transition-all duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-70'
                  }`}>
                    <div className="text-sm font-medium" style={{ 
                      color: isActive ? stage.color : colors.charcoal
                    }}>
                      {stage.title}
                    </div>
                    <div className="text-xs mt-1 max-w-28" style={{ color: colors.darkBrown }}>
                      {stage.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Prompt content */}
        <div className="rounded-xl p-8 transition-all duration-300"
          style={{ 
            backgroundColor: showPromptDetails ? 'white' : journey[currentStage].color + '20',
            boxShadow: showPromptDetails ? '0 4px 20px rgba(0,0,0,0.05)' : 'none',
            transform: showPromptDetails ? 'translateY(0)' : 'translateY(10px)'
          }}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold" style={{ color: journey[currentStage].color }}>
                {journey[currentStage].title}
              </h3>
              <p className="mt-1" style={{ color: colors.darkBrown }}>
                {journey[currentStage].description}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button 
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border"
                style={{ 
                  borderColor: colors.beige,
                  color: colors.darkBrown
                }}
                onClick={togglePromptDetails}
              >
                {showPromptDetails ? 'Hide Details' : 'Show Details'}
              </button>
              <button 
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center"
                style={{ 
                  backgroundColor: journey[currentStage].color,
                  color: 'white'
                }}
              >
                <Sparkles size={16} className="mr-1.5" /> 
                Cast Spell
              </button>
            </div>
          </div>
          
          {showPromptDetails && (
            <div 
              className="rounded-lg p-6 font-mono text-sm whitespace-pre-line transition-all duration-300"
              style={{ 
                backgroundColor: journey[currentStage].color + '10',
                borderLeft: `4px solid ${journey[currentStage].color}`
              }}
            >
              {journey[currentStage].prompt}
            </div>
          )}
          
          {/* Navigation buttons */}
          <div className="flex justify-between mt-10">
            <button
              className={`flex items-center text-sm font-medium transition-all duration-200 rounded-lg px-4 py-2.5 ${
                currentStage === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black hover:bg-opacity-5'
              }`}
              onClick={prevStage}
              disabled={currentStage === 0}
              style={{ color: colors.darkBrown }}
            >
              <ChevronLeft size={16} className="mr-1" /> Previous Chapter
            </button>
            
            <button
              className={`flex items-center text-sm font-medium transition-all duration-200 rounded-lg px-4 py-2.5 ${
                currentStage === journey.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black hover:bg-opacity-5'
              }`}
              onClick={nextStage}
              disabled={currentStage === journey.length - 1}
              style={{ color: colors.darkBrown }}
            >
              Next Chapter <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      </main>
      
      <footer className="px-8 py-6 mt-auto flex justify-between items-center text-sm" style={{ borderTop: `1px solid ${colors.beige}`, color: colors.darkBrown }}>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: journey[currentStage].color }}></div>
          <span className="font-medium">Journey Progress:</span> {Math.round((currentStage / (journey.length - 1)) * 100)}%
        </div>
        <div className="flex space-x-6">
          <button className="hover:underline">Save Journey</button>
          <button className="hover:underline">Share Journey</button>
          <button className="hover:underline">Export Prompts</button>
        </div>
      </footer>
    </div>
  );
};

export default PremiumNarrativeUI;


