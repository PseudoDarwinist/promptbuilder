import React, { useState, useEffect } from 'react';
import { colors } from '../../constants/colors';
import Button from '../common/Button';
import FileUploader from '../common/FileUploader';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { 
  Compass, Map, Code, Zap, BookOpen, 
  Lightbulb, Layers, PenTool, FileText,
  MessageSquare, Feather, Settings, Wrench, CheckSquare,
  Check, AlertTriangle, Database 
} from 'lucide-react';
import dbService from '../../api/db/database-service';

const StepForm = ({ initialData = {}, onSubmit, onCancel, journeyId }) => {
  console.log('[DEBUG] StepForm initializing with initialData:', {
    hasInitialData: !!initialData?.id,
    initialId: initialData?.id,
    initialTitle: initialData?.title,
    initialJourneyId: initialData?.journey_id || journeyId,
    hasPrompt: !!initialData?.prompt,
    initialAttachmentCount: initialData?.prompt?.attachments?.length || 0
  });

  const [formData, setFormData] = useState({
    journey_id: journeyId || initialData.journey_id,
    step_id: initialData.step_id || '',
    title: initialData.title || '',
    description: initialData.description || '',
    icon: initialData.icon || 'Compass',
    color: initialData.color || colors.terracotta,
    prompt: {
      content: initialData.prompt?.content || '',
      attachments: initialData.prompt?.attachments || []
    }
  });

  console.log('[DEBUG] StepForm initial state:', {
    journey_id: formData.journey_id,
    step_id: formData.step_id,
    hasPrompt: !!formData.prompt,
    attachmentCount: formData.prompt?.attachments?.length || 0,
    attachments: formData.prompt?.attachments?.map?.(a => ({
      filename: a.filename,
      type: a.file_type,
      size: a.file_size,
      has_data: !!a.file_data,
      data_length: a.file_data?.length || 0
    }))
  });
  
  // Update journey_id if it changes
  useEffect(() => {
    if (journeyId) {
      setFormData(prev => ({
        ...prev,
        journey_id: journeyId
      }));
    }
  }, [journeyId]);
  
  const [errors, setErrors] = useState({});
  const [dbError, setDbError] = useState(null);
  
  const iconOptions = [
    'Compass', 'Map', 'Code', 'Zap', 'BookOpen', 
    'Lightbulb', 'Layers', 'PenTool', 'FileText',
    'MessageSquare', 'Feather', 'Settings', 'Wrench', 'CheckSquare'
  ];

  // Map of icon names to their components
  const iconComponents = {
    Compass, Map, Code, Zap, BookOpen, 
    Lightbulb, Layers, PenTool, FileText,
    MessageSquare, Feather, Settings, Wrench, CheckSquare
  };
  
  const colorOptions = [
    colors.terracotta,
    colors.sage,
    colors.lavender,
    colors.brown,
    '#5B8FB9', // Additional blue
    '#ED7D3A', // Additional orange
    '#6E44FF', // Additional purple
    '#5F8D4E',  // Additional green
    '#FF1493', // Bright Pink (replacing Boysenberry Shadow)
    '#DBD0A8', // Capital Grains
    '#469BA7', // Sea Sparkle
    '#012731'  // Daintree
  ];
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'prompt.content') {
      setFormData(prev => ({
        ...prev,
        prompt: {
          ...prev.prompt,
          content: value
        }
      }));
    } else if (name.startsWith('prompt.')) {
      const promptField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        prompt: {
          ...prev.prompt,
          [promptField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const handlePromptContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      prompt: {
        ...prev.prompt,
        content: content
      }
    }));
    if (errors['prompt.content']) {
      setErrors(prev => ({ ...prev, ['prompt.content']: null }));
    }
  };
  
  const handleIconSelect = (icon) => {
    setFormData(prev => ({ ...prev, icon }));
  };
  
  const handleColorSelect = (color) => {
    setFormData(prev => ({ ...prev, color }));
  };
  
  const handleAttachmentsChange = (attachments) => {
    console.log('[DEBUG] handleAttachmentsChange called with attachments count:', attachments?.length || 0);
    console.log('[DEBUG] Attachments data:', attachments?.map?.(a => ({
      filename: a.filename, 
      type: a.file_type, 
      size: a.file_size,
      has_data: !!a.file_data,
      data_length: a.file_data?.length || 0
    })));
    
    setFormData(prev => {
      const updated = {
        ...prev,
        prompt: {
          ...prev.prompt,
          attachments
        }
      };
      
      console.log('[DEBUG] Updated formData.prompt.attachments count:', updated.prompt.attachments?.length || 0);
      return updated;
    });
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.journey_id) {
      newErrors['journey_id'] = 'Journey ID is required. Please ensure you are on a valid journey page.';
    }
    
    if (!formData.step_id.trim()) {
      newErrors['step_id'] = 'Step ID is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.step_id)) {
      newErrors['step_id'] = 'Step ID can only contain letters, numbers, underscores, and hyphens';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.prompt.content.trim()) {
      newErrors['prompt.content'] = 'Prompt content is required';
    }
    
    // Add validation for attachments
    if (formData.prompt?.attachments) {
      console.log('[DEBUG] Validating attachments:', {
        count: formData.prompt.attachments.length,
        details: formData.prompt.attachments.map(a => ({
          filename: a.filename,
          has_data: !!a.file_data,
          data_length: a.file_data?.length || 0
        }))
      });
      
      // Check if any attachment is missing data
      const invalidAttachments = formData.prompt.attachments.filter(a => !a.file_data);
      if (invalidAttachments.length > 0) {
        newErrors['prompt.attachments'] = `Some attachments are missing data: ${invalidAttachments.map(a => a.filename).join(', ')}`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('[DEBUG] Form submission started with data:', {
      id: initialData.id,
      journey_id: formData.journey_id,
      step_id: formData.step_id,
      hasPrompt: !!formData.prompt,
      attachmentCount: formData.prompt?.attachments?.length || 0,
    });
    
    if (validateForm()) {
      console.log('[DEBUG] Form validated successfully, submitting with attachments count:', 
        formData.prompt?.attachments?.length || 0);
      
      // Clone the data to avoid any reference issues
      const dataToSubmit = JSON.parse(JSON.stringify(formData));
      
      console.log('[DEBUG] Submission data after JSON cycle:', {
        journey_id: dataToSubmit.journey_id,
        step_id: dataToSubmit.step_id,
        hasPrompt: !!dataToSubmit.prompt,
        attachmentCount: dataToSubmit.prompt?.attachments?.length || 0,
        attachmentDetails: dataToSubmit.prompt?.attachments?.map(a => ({
          filename: a.filename,
          type: a.file_type,
          size: a.file_size,
          has_data: !!a.file_data,
          data_length: a.file_data?.length || 0
        }))
      });
      
      onSubmit(dataToSubmit);
    } else {
      console.log('[DEBUG] Form validation failed with errors:', errors);
    }
  };
  
  const handleVerifyDatabase = async () => {
    try {
      setDbError('Checking database...');
      const result = await dbService.initializeDatabase();
      if (result.success) {
        if (result.resetPerformed) {
          setDbError('Database was reset successfully. Please try your operation again.');
          setTimeout(() => setDbError(null), 3000);
        } else {
          setDbError('Database verified successfully.');
          setTimeout(() => setDbError(null), 1500);
        }
      } else {
        setDbError(`Database check failed: ${result.error}`);
      }
    } catch (error) {
      setDbError(`Database error: ${error.message}`);
    }
  };
  
  // If journey ID is missing, show an error message
  if (!formData.journey_id) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-charcoal">
            Cannot Create Step
          </h2>
          <p className="text-darkBrown mb-6">
            A journey must be selected before creating a step. Please ensure you are on a valid journey page.
          </p>
          <Button 
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }
  
  // If there's a database error, show it at the top of the form
  if (dbError) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Database size={40} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-charcoal">
            Database Status
          </h2>
          <p className="text-darkBrown mb-6">
            {dbError}
          </p>
          <div className="flex justify-center space-x-3">
            <Button 
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              Close
            </Button>
            <Button 
              type="button"
              variant="primary"
              onClick={handleVerifyDatabase}
              style={{ backgroundColor: colors.sage }}
            >
              Refresh Database
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-card p-6">
      <h2 className="text-xl font-semibold mb-6 text-charcoal">
        {initialData.id ? 'Edit Step' : 'Create New Step'}
      </h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1" htmlFor="step_id">
            Step ID
          </label>
          <input
            type="text"
            id="step_id"
            name="step_id"
            value={formData.step_id}
            onChange={handleChange}
            className={`w-full p-2 border rounded-lg ${errors.step_id ? 'border-red-500' : 'border-beige'}`}
            placeholder="e.g., requirements"
            disabled={initialData.id} // Can't change step_id after creation
          />
          {errors.step_id && <p className="text-red-500 text-xs mt-1">{errors.step_id}</p>}
          {!errors.step_id && <p className="text-xs text-darkBrown mt-1">Unique identifier for this step</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1" htmlFor="title">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`w-full p-2 border rounded-lg ${errors.title ? 'border-red-500' : 'border-beige'}`}
            placeholder="e.g., The Quest Begins"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-charcoal mb-1" htmlFor="description">
          Description
        </label>
        <input
          type="text"
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className={`w-full p-2 border rounded-lg ${errors.description ? 'border-red-500' : 'border-beige'}`}
          placeholder="e.g., Define what we seek to build"
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">
            Select Icon
          </label>
          <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto border border-beige rounded-lg p-2">
            {iconOptions.map(icon => {
              const IconComponent = iconComponents[icon];
              return (
                <button
                  key={icon}
                  type="button"
                  className={`p-2 rounded-lg transition-all ${
                    formData.icon === icon 
                      ? 'bg-opacity-10' 
                      : 'hover:bg-beige hover:bg-opacity-50'
                  }`}
                  style={{ 
                    backgroundColor: formData.icon === icon ? formData.color + '20' : '' 
                  }}
                  onClick={() => handleIconSelect(icon)}
                >
                  <div className="flex flex-col items-center">
                    <IconComponent size={20} color={formData.icon === icon ? formData.color : colors.darkBrown} />
                    <span className="text-xs mt-1">{icon}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">
            Select Color
          </label>
          <div className="grid grid-cols-4 gap-2">
            {colorOptions.map(color => (
              <button
                key={color}
                type="button"
                className={`w-full h-12 rounded-lg border-2 transition-all flex items-center justify-center ${
                  formData.color === color ? 'border-charcoal' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
              >
                {formData.color === color && (
                  <Check size={20} color="white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-charcoal mb-1" htmlFor="prompt.content">
          Prompt Content
        </label>
        <ReactQuill 
          theme="snow"
          value={formData.prompt.content}
          onChange={handlePromptContentChange}
          className={`font-mono text-sm ${errors['prompt.content'] ? 'ql-error' : ''}`}
          placeholder="Enter the prompt text here..."
          modules={{
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike', 'blockquote'],
              [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
              ['link', 'image'],
              ['clean']
            ],
          }}
        />
        {errors['prompt.content'] && <p className="text-red-500 text-xs mt-1">{errors['prompt.content']}</p>}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-charcoal mb-1">
          Attachments
        </label>
        <FileUploader 
          files={formData.prompt.attachments}
          onChange={handleAttachmentsChange}
        />
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
          style={{ backgroundColor: formData.color }}
        >
          {initialData.id ? 'Save Changes' : 'Create Step'}
        </Button>
      </div>
    </form>
  );
};

export default StepForm;