import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { Tag } from '@study-tracker/contracts';
import { X } from 'lucide-react';
import { useId, useState } from 'react';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useTags } from '../../hooks/useTags';
import { useTerms } from '../../hooks/useTerms';
import { tagsAPI } from '../../services/api';
import { useText } from '../../store/languageStore';

/** One tag: its name can be edited in place and saved, or the tag deleted after confirmation. */
function TagRow({ tag, busy, onRename, onRemove }: { tag: Tag; busy: boolean; onRename: (name: string) => Promise<boolean>; onRemove: () => void }) {
  const text = useText().tags;
  const id = useId();
  const [name, setName] = useState(tag.name);
  return (
    <li className="flex items-center gap-2 p-3">
      <label htmlFor={id} className="sr-only">{text.name(tag.name)}</label>
      <input id={id} className="input flex-1" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
      <button type="button" className="btn btn-secondary" aria-label={text.rename(tag.name)} disabled={busy || !name.trim() || name.trim() === tag.name} onClick={() => void onRename(name)}>
        {text.save}
      </button>
      <button type="button" className="btn btn-secondary text-red-600" aria-label={text.remove(tag.name)} disabled={busy} onClick={onRemove}>
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

/** The person's tag vocabulary: add, rename and delete. */
export default function TagManagerDialog({ onClose }: { onClose: () => void }) {
  const t = useTerms();
  const text = useText().tags;
  const newId = useId();
  const keys = useAccountQueryKeys();
  const tags = useTags();
  const mutation = useAccountMutation([keys.catalog('tags')]);
  const [name, setName] = useState('');
  const [removing, setRemoving] = useState<Tag | null>(null);

  return (
    <Dialog open onClose={() => { if (!mutation.isPending) onClose(); }} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className="panel mx-auto my-8 w-full max-w-lg shadow-xl">
          <div className="flex items-center justify-between border-b border-(--line) p-5">
            <DialogTitle className="text-lg font-medium">{text.manageTitle}</DialogTitle>
            <button type="button" onClick={onClose} aria-label={text.close} className="icon-button">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-sm text-(--muted)">{text.manageHint(t)}</p>
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim()) void mutation.save(() => tagsAPI.create(name), text.created).then((saved) => { if (saved) setName(''); });
              }}
            >
              <div className="flex-1">
                <label htmlFor={newId} className="mb-1 block text-sm font-medium">{text.newName}</label>
                <input id={newId} className="input" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={mutation.isPending || !name.trim()}>{text.add}</button>
            </form>
            {mutation.errorMessage && <p role="alert" className="text-sm text-red-600">{mutation.errorMessage}</p>}
            {tags.isPending ? (
              <p role="status" className="text-sm">{text.loading}</p>
            ) : tags.isError ? (
              <p role="alert" className="text-sm text-red-600">{text.failed}</p>
            ) : !tags.data.tags.length ? (
              <p className="text-sm text-(--muted)">{text.none}</p>
            ) : (
              <ul className="divide-y divide-(--line) rounded-lg border border-(--line)">
                {tags.data.tags.map((tag) => (
                  <TagRow
                    key={tag.id}
                    tag={tag}
                    busy={mutation.isPending}
                    onRename={(next) => mutation.save(() => tagsAPI.rename(tag.id, next), text.renamed)}
                    onRemove={() => setRemoving(tag)}
                  />
                ))}
              </ul>
            )}
          </div>
        </DialogPanel>
      </div>
      <ConfirmDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return false;
          const done = await mutation.save(() => tagsAPI.remove(removing.id), text.removed);
          if (done) setRemoving(null);
          return done;
        }}
        title={text.removeTitle}
        message={removing ? text.removeMessage(t, removing.name) : ''}
        type="danger"
      />
    </Dialog>
  );
}
