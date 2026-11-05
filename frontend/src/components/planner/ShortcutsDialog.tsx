import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { useTerms } from '../../hooks/useTerms';
import { useText } from '../../store/languageStore';

/** The planner's fixed keyboard shortcuts; the keys are the same in every language. */
const plannerShortcuts = [
  ['undo', ['Ctrl', 'Z']],
  ['redo', ['Ctrl', 'Y']],
  ['today', ['T']],
  ['navigate', ['←', '→']],
  ['views', ['1', '2', '3']],
  ['create', ['N']],
  ['fullscreen', ['F']],
  ['help', ['?']],
  ['cancel', ['Esc']],
] as const;

export default function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const t = useTerms();
  const text = useText().planner;
  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="panel w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-lg font-medium">{text.shortcuts}</DialogTitle>
              <button type="button" onClick={onClose} aria-label={text.close} className="rounded-sm p-1 text-(--muted) hover:bg-(--subtle)">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Description className="mt-2 text-sm text-(--muted)">{text.shortcutsNote}</Description>
            <dl className="mt-5 divide-y divide-(--line) text-sm">
              {plannerShortcuts.map(([name, keys]) => {
                const label = text.shortcutItems[name];
                return (
                  <div key={name} className="flex items-center justify-between gap-4 py-2">
                    <dt>{typeof label === 'function' ? label(t) : label}</dt>
                    <dd className="flex shrink-0 gap-1">
                      {keys.map((key) => (
                        <kbd key={key} className="min-w-6 rounded-sm border border-(--line) bg-(--subtle) px-1.5 py-0.5 text-center font-mono text-xs">
                          {key}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
