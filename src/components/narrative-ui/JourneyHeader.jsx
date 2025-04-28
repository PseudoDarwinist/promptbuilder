import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Info, Settings } from 'lucide-react';
import { useJourneyStore } from '../../hooks/useJourneyStore';
import { colors } from '../../constants/colors';
import IconButton from '../common/IconButton';

const JourneyHeader = () => {
  const { currentJourney } = useJourneyStore();
  
  return (
    <header 
      className="px-8 py-6 flex justify-between items-center"
      style={{ borderBottom: `1px solid ${colors.beige}` }}
    >
      <Link to="/" className="flex items-center space-x-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.sage }}
        >
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-charcoal">PromptFlow</h1>
          <p className="text-sm text-darkBrown">
            {currentJourney ? currentJourney.name : 'The Journey of Building an App'}
          </p>
        </div>
      </Link>
      
      <div className="flex space-x-2 items-center">
        <IconButton 
          icon={<Info size={20} />} 
          color={colors.darkBrown}
          aria-label="Information"
        />
        <IconButton 
          icon={<Settings size={20} />} 
          color={colors.darkBrown}
          aria-label="Settings"
        />
        <div 
          className="ml-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
          style={{ background: `linear-gradient(to bottom right, ${colors.sage}, ${colors.terracotta})` }}
        >
          JS
        </div>
      </div>
    </header>
  );
};

export default JourneyHeader;