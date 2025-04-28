import React, { useState } from 'react';
import { colors } from '../../constants/colors';
import Button from '../common/Button';
import * as LucideIcons from 'lucide-react';

const JourneyForm = ({ initialData = {}, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    icon: initialData.icon || 'Compass'
  });
  
  const [errors, setErrors] = useState({});
  
  const iconOptions = [
    'Compass', 'Map', 'Code', 'Zap', 'BookOpen', 
    'Lightbulb', 'Brain', 'Layers', 'PenTool', 'FileText'
  ];
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const handleIconSelect = (icon) => {
    setFormData(prev => ({ ...prev, icon }));
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Journey name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.icon) {
      newErrors.icon = 'Please select an icon';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-card p-6">
      <h2 className="text-xl font-semibold mb-6 text-charcoal">
        {initialData.id ? 'Edit Journey' : 'Create New Journey'}
      </h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-charcoal mb-1" htmlFor="name">
          Journey Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`w-full p-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-beige'}`}
          placeholder="e.g., Software Development Process"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-charcoal mb-1" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className={`w-full p-2 border rounded-lg ${errors.description ? 'border-red-500' : 'border-beige'}`}
          rows="3"
          placeholder="Describe what this journey is about..."
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-charcoal mb-1">
          Select Icon
        </label>
        <div className="grid grid-cols-5 gap-2">
          {iconOptions.map(icon => {
            const IconComponent = LucideIcons[icon];
            return (
              <button
                key={icon}
                type="button"
                className={`p-3 rounded-lg border transition-all ${
                  formData.icon === icon 
                    ? 'border-terracotta bg-terracotta bg-opacity-10' 
                    : 'border-beige hover:border-terracotta'
                }`}
                onClick={() => handleIconSelect(icon)}
              >
                <div className="flex flex-col items-center">
                  <IconComponent size={24} color={formData.icon === icon ? colors.terracotta : colors.darkBrown} />
                  <span className="text-xs mt-1">{icon}</span>
                </div>
              </button>
            );
          })}
        </div>
        {errors.icon && <p className="text-red-500 text-xs mt-1">{errors.icon}</p>}
      </div>
      
      <div className="flex justify-end space-x-3">
        <Button 
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          variant="primary"
          style={{ backgroundColor: colors.terracotta }}
        >
          {initialData.id ? 'Save Changes' : 'Create Journey'}
        </Button>
      </div>
    </form>
  );
};

export default JourneyForm;