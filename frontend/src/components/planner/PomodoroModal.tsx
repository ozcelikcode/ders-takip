import React from 'react';
import { Dialog } from '@headlessui/react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
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
    <MotionConfig reducedMotion="user">
    <AnimatePresence>
      {isOpen && (
        <Dialog
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          open={isOpen}
          onClose={onClose}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

          <div
            className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'inset-0 flex items-center justify-center p-4'}`}
          >
            <Dialog.Panel
              as={motion.div}
              initial={
                isMinimized
                  ? { scale: 0.8, y: 100 }
                  : { scale: 0.95, opacity: 0 }
              }
              animate={
                isMinimized ? { scale: 1, y: 0 } : { scale: 1, opacity: 1 }
              }
              exit={
                isMinimized
                  ? { scale: 0.8, y: 100 }
                  : { scale: 0.95, opacity: 0 }
              }
              className={`panel shadow-xl ${
                isMinimized
                  ? 'w-[min(320px,calc(100vw-32px))]'
                  : 'mx-auto max-w-lg w-full'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <Dialog.Title className="text-lg font-medium">
                  Pomodoro
                </Dialog.Title>
                <div className="flex items-center gap-2">
                  {onToggleMinimize && (
                    <button
                      onClick={onToggleMinimize}
                      aria-label={
                        isMinimized ? 'Sayacı büyüt' : 'Sayacı küçült'
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
                    aria-label="Sayacı kapat"
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
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
    </MotionConfig>
  );
};

export default PomodoroModal;
