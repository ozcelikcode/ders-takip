import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import type { ReactNode, FormEvent } from 'react';

export default function EditorDialog({
  title,
  description,
  pending,
  error,
  onClose,
  onSubmit,
  children,
  disabled = false,
}: {
  title: string;
  description: string;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const close = () => {
    if (!pending) onClose();
  };
  return (
    <Dialog open onClose={close} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            className="panel w-full max-w-lg p-6 shadow-xl"
            aria-busy={pending}
          >
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-lg font-medium">
                {title}
              </DialogTitle>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                aria-label="Düzenleyiciyi kapat"
                className="rounded-sm p-1 text-(--muted) hover:bg-(--subtle) disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Description className="mt-2 text-sm text-(--muted)">
              {description}
            </Description>
            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
              <fieldset
                disabled={pending}
                className="space-y-4 disabled:opacity-60"
              >
                {children}
              </fieldset>
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3 border-t border-(--line) pt-5">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="btn btn-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={pending || disabled}
                  className="btn btn-primary"
                >
                  {pending ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
