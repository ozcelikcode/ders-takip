import React from 'react';
import { Dialog } from '@headlessui/react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudySession } from '../../types/planner';
import PomodoroTimer from './PomodoroTimer';

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
  if (!session) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          open={isOpen}
          onClose={() => {}} // Prevent closing by clicking backdrop during active session
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

          <div className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'inset-0 flex items-center justify-center p-4'}`}>
            <Dialog.Panel
              as={motion.div}
              initial={isMinimized ? { scale: 0.8, y: 100 } : { scale: 0.95, opacity: 0 }}
              animate={isMinimized ? { scale: 1, y: 0 } : { scale: 1, opacity: 1 }}
              exit={isMinimized ? { scale: 0.8, y: 100 } : { scale: 0.95, opacity: 0 }}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${
                isMinimized
                  ? 'w-80 max-w-sm'
                  : 'mx-auto max-w-lg w-full'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isMinimized ? 'Pomodoro' : 'Pomodoro Timer'}
                </Dialog.Title>
                <div className="flex items-center gap-2">
                  {onToggleMinimize && (
                    <button
                      onClick={onToggleMinimize}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Timer Content */}
              <div className={`p-6 ${isMinimized ? 'pb-4' : ''}`}>
                <PomodoroTimer
                  session={session}
                  onComplete={onClose}
                  onStop={onClose}
                />
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default PomodoroModal;