import React, { useEffect, useState } from 'react';
import { Download, File, Image, FileText, ExternalLink, Trash, X, Maximize2 } from 'lucide-react';
import { colors } from '../../constants/colors';

const AttachmentViewer = ({ attachments = [], onDownload, onDelete, stepColor }) => {
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  
  // Close modal when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedAttachment) {
        setSelectedAttachment(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAttachment]);
  
  // Log when this component renders and what data it receives
  useEffect(() => {
    console.log('[ATTACHMENT VIEWER] Rendering with attachments:', 
      Array.isArray(attachments) ? 
        attachments.map(a => ({ 
          id: a.id, 
          filename: a.filename,
          has_data: !!a.file_data,
          data_length: a.file_data?.length || 0
        })) : 
        'Invalid attachments data'
    );
    
    // Validate attachments data structure
    if (Array.isArray(attachments)) {
      const validAttachments = attachments.filter(a => a && a.filename);
      if (validAttachments.length !== attachments.length) {
        console.warn('[ATTACHMENT VIEWER] Some attachments have invalid data structure:', 
          attachments.filter(a => !a || !a.filename)
        );
      }

      const attachmentsWithData = attachments.filter(a => a && a.file_data);
      if (attachmentsWithData.length !== attachments.length) {
        console.warn('[ATTACHMENT VIEWER] Some attachments are missing file_data:', 
          attachments.filter(a => !a || !a.file_data).map(a => a.filename)
        );
      }
    } else {
      console.error('[ATTACHMENT VIEWER] Attachments is not an array:', attachments);
    }
  }, [attachments]);
  
  // If no attachments or empty array, show a message
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    console.log('[ATTACHMENT VIEWER] No attachments to display');
    return (
      <div 
        className="mt-4 p-3 border rounded-lg"
        style={{
          borderColor: stepColor ? `${stepColor}33` : colors.amber[200],
          backgroundColor: stepColor ? `${stepColor}1A` : colors.amber[50],
        }}
      >
        <h3 
          className="text-sm font-medium mb-1"
          style={{ color: stepColor || colors.amber[700] }}
        >
          No Attachments
        </h3>
        <p 
          className="text-xs"
          style={{ color: stepColor ? `${stepColor}B3` : colors.amber[600] }}
        >
          This prompt doesn't have any attachments.
        </p>
      </div>
    );
  }
  
  // Filter out invalid attachments
  const validAttachments = attachments.filter(a => a && a.filename && a.file_type);
  console.log('[ATTACHMENT VIEWER] Filtered to', validAttachments.length, 'valid attachments');
  
  // If all attachments were invalid, show message
  if (validAttachments.length === 0) {
    console.log('[ATTACHMENT VIEWER] All attachments were invalid');
    return (
      <div 
        className="mt-4 p-3 border rounded-lg"
        style={{
          borderColor: stepColor ? `${stepColor}33` : colors.amber[200],
          backgroundColor: stepColor ? `${stepColor}1A` : colors.amber[50],
        }}
      >
        <h3 
          className="text-sm font-medium mb-1"
          style={{ color: stepColor || colors.amber[700] }}
        >
          Attachment Error
        </h3>
        <p 
          className="text-xs"
          style={{ color: stepColor ? `${stepColor}B3` : colors.amber[600] }}
        >
          The attachments data is invalid or corrupted.
        </p>
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
  
  const handleDownload = async (attachment) => {
    console.log('[AttachmentViewer] handleDownload called. Checking for onDownload prop.');
    if (onDownload) {
      console.log('[AttachmentViewer] onDownload prop IS present. Calling it.');
      onDownload(attachment);
    } else if (attachment.file_data) {
      console.log('[AttachmentViewer] onDownload prop NOT present. Using internal download logic.');
      try {
        // Use fetch to convert data URL to blob
        const response = await fetch(attachment.file_data);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        
        // Create and trigger download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename || 'download';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } catch (error) {
        console.error('Error downloading attachment:', error);
        alert('Failed to download attachment: ' + error.message);
      }
    }
  };

  const handleDelete = (attachment) => {
    if (onDelete) {
      if (window.confirm(`Are you sure you want to delete "${attachment.filename}"?`)) {
        onDelete(attachment);
      }
    }
  };
  
  const handleOpen = (url, attachment) => {
    if (!url) {
      console.error('Cannot open attachment: No URL provided');
      return;
    }
    
    // Show the attachment in the modal
    setSelectedAttachment(attachment);
  };
  
  return (
    <div 
      className="mt-4 border rounded-lg p-2"
      style={{
        borderColor: stepColor ? `${stepColor}33` : colors.terracotta + '33',
        backgroundColor: stepColor ? `${stepColor}1A` : colors.terracotta + '0D',
      }}
    >
      <h3 
        className="text-xs font-medium mb-1"
        style={{ color: stepColor || colors.terracotta }}
      >
        Attachments ({validAttachments.length})
      </h3>
      <div className="inline-grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-1">
        {validAttachments.map((attachment, index) => {
          const isImage = attachment.file_type && attachment.file_type.startsWith('image/');
          const isPdf = attachment.file_type && attachment.file_type.includes('pdf');

          return (
            <div 
              key={`${attachment.id || index}-${attachment.filename}`} 
              className="bg-white border border-gray-200 rounded overflow-hidden flex flex-col"
              style={{ height: 'auto', width: 'auto', maxWidth: '180px', maxHeight: '180px' }}
            >
              <div className="py-0.5 px-1 flex items-center bg-gray-50" style={{ minHeight: '20px' }}>
                <div className="flex-shrink-0">
                  {getFileIcon(attachment.file_type)}
                </div>
                <div className="flex-1 min-w-0 px-1">
                  <p className="text-xs font-medium text-charcoal truncate text-left">
                    {attachment.filename.length > 15 ? 
                      `${attachment.filename.substring(0, 12)}...` : 
                      attachment.filename}
                    {attachment.file_size && (
                      <span className="text-xs text-darkBrown opacity-70 ml-1">
                        ({formatFileSize(attachment.file_size)})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-shrink-0">
                  <button
                    type="button"
                    className="p-0.5 text-darkBrown hover:text-terracotta"
                    onClick={() => handleOpen(attachment.file_data, attachment)}
                    title="View"
                  >
                    <Maximize2 size={12} />
                  </button>
                  <button
                    type="button"
                    className="p-0.5 text-darkBrown hover:text-terracotta"
                    onClick={() => handleDownload(attachment)}
                    title="Download"
                  >
                    <Download size={12} />
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      className="p-0.5 text-darkBrown hover:text-red-500"
                      onClick={() => handleDelete(attachment)}
                      title="Delete"
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              </div>
              {attachment.file_data && isImage && (
                <div 
                  className="cursor-pointer flex-1 flex items-center justify-center"
                  onClick={() => handleOpen(attachment.file_data, attachment)}
                >
                  <img 
                    src={attachment.file_data} 
                    alt={`Preview of ${attachment.filename}`} 
                    className="max-w-full max-h-[150px]" 
                  />
                </div>
              )}
              {attachment.file_data && isPdf && (
                <div className="flex-1 overflow-hidden">
                  <div 
                    className="cursor-pointer h-full w-full flex items-center justify-center bg-gray-100 text-center" 
                    onClick={() => handleOpen(attachment.file_data, attachment)}
                  >
                    <FileText size={24} className="text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Modal for displaying attachment in full view */}
      {selectedAttachment && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="relative max-w-full max-h-full w-auto h-auto">
            <button
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 hover:bg-opacity-75 p-1 rounded-full"
              onClick={() => setSelectedAttachment(null)}
            >
              <X size={24} />
            </button>
            
            {selectedAttachment.file_type && selectedAttachment.file_type.startsWith('image/') ? (
              <img 
                src={selectedAttachment.file_data} 
                alt={selectedAttachment.filename}
                className="max-w-full max-h-screen object-contain" 
              />
            ) : selectedAttachment.file_type && selectedAttachment.file_type.includes('pdf') ? (
              <div className="bg-white p-1 max-w-6xl max-h-[90vh] w-full h-full">
                <embed
                  src={selectedAttachment.file_data}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  className="min-h-[80vh]"
                />
              </div>
            ) : (
              <div className="text-center py-8 bg-white p-6 rounded">
                <div className="mx-auto mb-4 p-3 rounded-full bg-gray-100 inline-block">
                  <File size={48} className="text-gray-500" />
                </div>
                <p>This file type cannot be previewed</p>
                <button
                  className="mt-4 px-4 py-2 bg-terracotta text-white rounded-md"
                  onClick={() => handleDownload(selectedAttachment)}
                >
                  Download
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentViewer; 