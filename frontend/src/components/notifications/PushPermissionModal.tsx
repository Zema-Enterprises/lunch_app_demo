import React from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '../ui/button';

interface PushPermissionModalProps {
  isOpen: boolean;
  onEnable: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

/**
 * PushPermissionModal
 * 
 * A clean, designed modal for requesting push notification permission.
 * Replaces the native window.confirm() dialog.
 */
const PushPermissionModal: React.FC<PushPermissionModalProps> = ({
  isOpen,
  onEnable,
  onDismiss,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onDismiss}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-modal-title"
        aria-describedby="push-modal-description"
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <Bell className="w-8 h-8 text-white" />
            </div>
            {/* Notification badge pulse */}
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full" />
            </span>
          </div>
        </div>

        {/* Content */}
        <h2 
          id="push-modal-title" 
          className="text-xl font-semibold text-center text-gray-900 mb-2"
        >
          Stay in the Loop
        </h2>
        <p 
          id="push-modal-description" 
          className="text-center text-gray-600 mb-6"
        >
          Enable push notifications to get instant alerts about lunch events, order updates, and more — even when LunchSync is closed.
        </p>

        {/* Features list */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-lg">🎉</span>
            <span>New lunch event created</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-lg">⏰</span>
            <span>Order deadline reminders</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-lg">🚚</span>
            <span>Delivery notifications</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button 
            onClick={onEnable}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Enabling...
              </span>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
          <Button 
            variant="ghost"
            onClick={onDismiss}
            disabled={isLoading}
            className="w-full text-gray-500 hover:text-gray-700"
          >
            Not Now
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-center text-gray-400 mt-4">
          You can change this anytime in Settings
        </p>
      </div>
    </div>
  );
};

export default PushPermissionModal;
