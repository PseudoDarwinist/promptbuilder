import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText, FilePlus } from 'lucide-react';
import { colors } from '../../constants/colors';

const FileUploader = ({ files, onChange, maxSize = 5 * 1024 * 1024 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const processFiles = async (fileList) => {
    setError(null);
    
    const fileArray = Array.from(fileList);
    
    // Check file size
    const oversizedFiles = fileArray.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      const filenames = oversizedFiles.map(f => f.name).join(', ');
      setError(`File(s) too large: ${filenames}. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
      return;
    }
    
    // Process files
    const newFiles = await Promise.all(
      fileArray.map(async (file) => {
        try {
          console.log('Processing file:', file.name, 'size:', file.size, 'type:', file.type);
          const fileData = await readFileAsDataURL(file);
          console.log('File data converted to base64, length:', fileData.length);
          
          return {
            filename: file.name,
            file_type: file.type,
            file_size: file.size,
            file_data: fileData,
            file // Keep the original file for preview
          };
        } catch (err) {
          console.error('Error processing file:', file.name, err);
          return null;
        }
      })
    );
    
    // Filter out any null entries (failed conversions)
    const validFiles = newFiles.filter(f => f !== null);
    
    if (validFiles.length === 0) {
      setError('Failed to process any files. Please try again with different files.');
      return;
    }
    
    if (validFiles.length < fileArray.length) {
      setError('Some files could not be processed and were skipped.');
    }
    
    // Log before adding to make sure we have complete data
    console.log('Processed files ready for upload:', validFiles.map(f => ({
      filename: f.filename,
      file_size: f.file_size,
      file_type: f.file_type,
      has_file_data: !!f.file_data,
      file_data_length: f.file_data ? f.file_data.length : 0
    })));
    
    // Add to existing files
    onChange([...files, ...validFiles]);
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };
  
  const handleChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };
  
  const handleButtonClick = () => {
    fileInputRef.current.click();
  };
  
  const handleRemoveFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };
  
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <Image size={20} color={colors.darkBrown} />;
    } else if (fileType.includes('pdf')) {
      return <FileText size={20} color={colors.darkBrown} />;
    } else {
      return <File size={20} color={colors.darkBrown} />;
    }
  };
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="w-full">
      {/* File list */}
      {files.length > 0 && (
        <div className="mb-3">
          <h3 className="text-sm font-medium text-charcoal mb-1">Attached Files</h3>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="flex items-center p-2 bg-beige bg-opacity-20 rounded-lg">
                <div className="mr-2">
                  {getFileIcon(file.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">{file.filename}</p>
                  <p className="text-xs text-darkBrown">{formatFileSize(file.file_size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="p-1 text-darkBrown hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center ${
          dragActive ? 'border-terracotta bg-terracotta bg-opacity-5' : 'border-beige'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
        />
        
        <FilePlus size={28} className="mx-auto mb-2 text-darkBrown" />
        
        <div className="space-y-1">
          <p className="text-sm text-charcoal">
            <button
              type="button"
              onClick={handleButtonClick}
              className="font-medium text-terracotta hover:underline"
            >
              Click to upload
            </button>{' '}
            or drag and drop
          </p>
          <p className="text-xs text-darkBrown">
            Images, documents, or other files (max {maxSize / (1024 * 1024)}MB)
          </p>
        </div>
      </div>
      
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

export default FileUploader; 