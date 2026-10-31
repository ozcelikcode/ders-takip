import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { StudySession } from '../../types/planner';
import PomodoroTimer from './PomodoroTimer';
import { useText } from '../../store/languageStore';

interface PomodoroModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: StudySession | null;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

const PomodoroModal: React.FC<PomodoroModalProps> = ({
  isOpen,
  onClose,
  session,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const text = useText().pomodoro;
  if (!session || !isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50 animate-fade-in"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div
        className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'inset-0 flex items-center justify-center p-4'}`}
      >
        <DialogPanel
          className={`animate-dialog-in panel shadow-xl ${
            isMinimized
              ? 'w-[min(320px,calc(100vw-32px))]'
              : 'mx-auto max-w-lg w-full'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-lg font-medium">
              {text.modalTitle}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {onToggleMinimize && (
                <button
                  onClick={onToggleMinimize}
                  aria-label={
                    isMinimized ? text.expand : text.minimize
                  }
                  className="icon-button"
                >
                  {isMinimized ? (
                    <Maximize2 className="w-5 h-5" />
                  ) : (
                    <Minimize2 className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                aria-label={text.close}
                className="icon-button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Timer Content */}
          <div className={`p-6 ${isMinimized ? 'pb-4' : ''}`}>
            <PomodoroTimer session={session} onComplete={onClose} />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default PomodoroModal;
