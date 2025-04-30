import React, { useState, useEffect } from 'react';
import { useJourneyStore } from '../../hooks/useJourneyStore';
import Modal from './Modal';
import Button from './Button';
import { Share2, Copy, X, Loader2 } from 'lucide-react';
import { colors } from '../../constants/colors';

const ShareJourneyModal = ({ isOpen, onClose }) => {
  const { currentJourney, enableSharing, disableSharing, loading, error } = useJourneyStore();
  const [shareLink, setShareLink] = useState('');
  const [copyStatus, setCopyStatus] = useState('Copy Link');

  useEffect(() => {
    // This effect updates the share link displayed in the modal when the journey data changes
    if (currentJourney?.is_shared && currentJourney?.share_id) {
      const link = `${window.location.origin}/share/${currentJourney.share_id}`;
      setShareLink(link);
    } else {
      setShareLink('');
    }
    setCopyStatus('Copy Link'); // Reset copy status whenever modal opens or journey data changes
  }, [isOpen, currentJourney?.is_shared, currentJourney?.share_id]); // Re-run if modal opens or sharing status changes

  const handleEnableSharing = async () => {
    try {
      await enableSharing();
      // Link will update via useEffect
    } catch (err) {
      console.error("Modal: Failed to enable sharing", err);
      // Error is handled in the store and displayed via the 'error' variable
    }
  };

  const handleDisableSharing = async () => {
    try {
      await disableSharing();
    } catch (err) {
      console.error("Modal: Failed to disable sharing", err);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy Link'), 2000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
      setCopyStatus('Failed');
      setTimeout(() => setCopyStatus('Copy Link'), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Journey">
      <div className="p-6">
        {!currentJourney ? (
          <p className="text-sm text-darkBrown dark:text-gray-300">Loading journey details...</p>
        ) : (
          <>
            <p className="text-sm text-darkBrown dark:text-gray-300 mb-6">
              {currentJourney.is_shared
                ? "Sharing is enabled. Anyone with the link below can view this journey."
                : "Enable sharing to generate a unique link for viewing this journey."}
            </p>

            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm mb-4">Error: {error}</p>
            )}

            {currentJourney.is_shared && shareLink && (
              <div className="mb-6">
                <label htmlFor="share-link" className="block text-sm font-medium text-charcoal dark:text-gray-200 mb-1">
                  Shareable Link:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="share-link"
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-grow p-2 border border-beige dark:border-gray-600 rounded-md bg-offWhite dark:bg-gray-700 text-darkBrown dark:text-gray-200 text-sm focus:outline-none"
                  />
                  <Button
                    variant="secondary"
                    icon={<Copy size={16} />}
                    onClick={handleCopyLink}
                    disabled={copyStatus !== 'Copy Link'}
                  >
                    {copyStatus}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Close
              </Button>

              {currentJourney.is_shared ? (
                <Button
                  variant="danger"
                  icon={loading ? <Loader2 className="animate-spin" size={16}/> : <X size={16} />}
                  onClick={handleDisableSharing}
                  disabled={loading}
                >
                  {loading ? 'Disabling...' : 'Disable Sharing'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  style={{ backgroundColor: colors.sage }}
                  icon={loading ? <Loader2 className="animate-spin" size={16}/> : <Share2 size={16} />}
                  onClick={handleEnableSharing}
                  disabled={loading}
                >
                  {loading ? 'Enabling...' : 'Enable Sharing'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ShareJourneyModal; 