import React, { useState } from 'react';
import Tag from './Tag';
import { colors } from '../../constants/colors';

const TagsInput = ({ tags, onChange, availableTags = [] }) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const handleInputChange = (e) => {
    setInput(e.target.value);
    setShowSuggestions(true);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addTag(input.trim());
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      const newTags = [...tags];
      newTags.pop();
      onChange(newTags);
    }
  };
  
  const addTag = (tagName) => {
    if (tagName && !tags.includes(tagName)) {
      const newTags = [...tags, tagName];
      onChange(newTags);
      setInput('');
    }
  };
  
  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onChange(newTags);
  };
  
  const filteredSuggestions = input.trim() 
    ? availableTags.filter(tag => 
        tag.toLowerCase().includes(input.toLowerCase()) && 
        !tags.includes(tag)
      )
    : [];
  
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-white min-h-10 items-center"
           style={{ borderColor: colors.beige }}>
        {tags.map(tag => (
          <Tag 
            key={tag} 
            label={tag} 
            onRemove={() => removeTag(tag)} 
          />
        ))}
        <div className="relative flex-1 min-w-20">
          <input
            type="text"
            className="w-full py-1 bg-transparent outline-none text-sm placeholder-darkBrown placeholder-opacity-50"
            placeholder={tags.length === 0 ? "Add tags..." : ""}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-beige rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
              {filteredSuggestions.map(suggestion => (
                <div
                  key={suggestion}
                  className="px-3 py-2 text-sm hover:bg-beige cursor-pointer"
                  onClick={() => addTag(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-darkBrown mt-1">
        Press Enter to add a tag, Backspace to remove the last tag
      </p>
    </div>
  );
};

export default TagsInput;