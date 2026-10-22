import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useText } from '../../store/languageStore';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | boolean | Promise<void | boolean>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  children?: ReactNode;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = 'warning',
  children,
}: ConfirmDialogProps) {
  const common = useText().common;
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (isOpen) setFailed(false);
  }, [isOpen]);
  const close = () => {
    if (!pending) onClose();
  };
  const confirm = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFailed(false);
    try {
      const result = await onConfirm();
      if (result !== false) onClose();
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return (
    <Dialog open={isOpen} onClose={close} className="relative z-60">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            className="panel w-full max-w-md p-6 shadow-xl"
            aria-busy={pending}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`mt-0.5 h-5 w-5 shrink-0 ${type === 'danger' ? 'text-red-600' : 'text-(--muted)'}`}
                />
                <DialogTitle className="text-base font-medium">
                  {title}
                </DialogTitle>
              </div>
              <button
                disabled={pending}
                aria-label={common.closeConfirm}
                onClick={close}
                className="rounded-sm p-1 text-(--muted) hover:bg-(--subtle) disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Description className="mt-4 text-sm text-(--muted)">
              {message}
            </Description>
            {children && <div className="mt-4">{children}</div>}
            {failed && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {common.actionFailed}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={pending}
                className="btn btn-secondary"
                onClick={close}
              >
                {cancelText ?? common.cancel}
              </button>
              <button
                disabled={pending}
                className={
                  type === 'danger'
                    ? 'btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
                    : 'btn btn-primary'
                }
                onClick={() => void confirm()}
              >
                {pending ? common.processing : (confirmText ?? common.confirm)}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
