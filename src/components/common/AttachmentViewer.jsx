import React, { useEffect } from 'react';
import { Download, File, Image, FileText, ExternalLink, Trash } from 'lucide-react';
import { colors } from '../../constants/colors';

const AttachmentViewer = ({ attachments = [], onDownload, onDelete }) => {
  // Log when this component renders and what data it receives
  useEffect(() => {
    console.log('AttachmentViewer component rendered with attachments:', 
      Array.isArray(attachments) ? 
        attachments.map(a => ({ id: a.id, filename: a.filename })) : 
        'Invalid attachments data'
    );
    
    // Validate attachments data structure
    if (Array.isArray(attachments)) {
      const validAttachments = attachments.filter(a => a && a.filename);
      if (validAttachments.length !== attachments.length) {
        console.warn('Some attachments have invalid data structure:', 
          attachments.filter(a => !a || !a.filename)
        );
      }
    } else {
      console.error('Attachments is not an array:', attachments);
    }
  }, [attachments]);
  
  // If no attachments or empty array, show a message
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return (
      <div className="mt-4 p-3 border border-amber-200 bg-amber-50 rounded-lg">
        <h3 className="text-sm font-medium text-amber-700 mb-1">No Attachments</h3>
        <p className="text-xs text-amber-600">This prompt doesn't have any attachments.</p>
      </div>
    );
  }
  
  // Filter out invalid attachments
  const validAttachments = attachments.filter(a => a && a.filename && a.file_type);
  
  // If all attachments were invalid, show message
  if (validAttachments.length === 0) {
    return (
      <div className="mt-4 p-3 border border-amber-200 bg-amber-50 rounded-lg">
        <h3 className="text-sm font-medium text-amber-700 mb-1">Attachment Error</h3>
        <p className="text-xs text-amber-600">The attachments data is invalid or corrupted.</p>
      </div>
    );
  }
  
  const getFileIcon = (fileType) => {
    if (!fileType) return <File size={20} color={colors.darkBrown} />;
    if (fileType.startsWith('image/')) {
      return <Image size={20} color={colors.darkBrown} />;
    } else if (fileType.includes('pdf')) {
      return <FileText size={20} color={colors.darkBrown} />;
    } else {
      return <File size={20} color={colors.darkBrown} />;
    }
  };
  
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const handleDownload = (attachment) => {
    if (onDownload) {
      onDownload(attachment);
    }
  };

  const handleDelete = (attachment) => {
    if (onDelete) {
      if (window.confirm(`Are you sure you want to delete "${attachment.filename}"?`)) {
        onDelete(attachment);
      }
    }
  };
  
  const handleOpen = (url) => {
    if (!url) {
      console.error('Cannot open attachment: No URL provided');
      return;
    }
    window.open(url, '_blank');
  };
  
  return (
    <div className="mt-6 border border-terracotta border-opacity-20 bg-terracotta bg-opacity-5 rounded-lg p-4">
      <h3 className="text-sm font-medium text-terracotta mb-3">
        Attachments ({validAttachments.length})
      </h3>
      <div className="space-y-2">
        {validAttachments.map((attachment, index) => (
          <div 
            key={`${attachment.id || index}-${attachment.filename}`} 
            className="flex items-center p-3 bg-white border border-beige rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="mr-3 p-2 bg-beige bg-opacity-20 rounded-md">
              {getFileIcon(attachment.file_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-charcoal truncate">
                {attachment.filename}
              </p>
              {attachment.file_size && (
                <p className="text-xs text-darkBrown">
                  {formatFileSize(attachment.file_size)}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              {attachment.file_data && (
                <button
                  type="button"
                  className="p-2 text-darkBrown hover:text-terracotta transition-colors hover:bg-terracotta hover:bg-opacity-10 rounded-full"
                  onClick={() => handleOpen(attachment.file_data)}
                  title="Open"
                >
                  <ExternalLink size={18} />
                </button>
              )}
              <button
                type="button"
                className="p-2 text-darkBrown hover:text-terracotta transition-colors hover:bg-terracotta hover:bg-opacity-10 rounded-full"
                onClick={() => handleDownload(attachment)}
                title="Download"
              >
                <Download size={18} />
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="p-2 text-darkBrown hover:text-red-500 transition-colors hover:bg-red-50 rounded-full"
                  onClick={() => handleDelete(attachment)}
                  title="Delete"
                >
                  <Trash size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttachmentViewer; 