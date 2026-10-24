import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTerms } from '../../hooks/useTerms';
import { serverMessage } from '../../lib/messages';
import { useAuthStore } from '../../store/authStore';
import { useText } from '../../store/languageStore';

/** Picks a file from "Download my data" and loads it into this account; the server accepts it only while the account is empty. */
export default function AccountImportButton({ label }: { label: string }) {
  const t = useTerms();
  const text = useText().profile;
  const queryClient = useQueryClient();
  const importAccount = useAuthStore((state) => state.importAccount);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        setError(text.importUnreadable);
        return;
      }
      const result = await importAccount(data);
      await queryClient.invalidateQueries();
      toast.success(text.imported(t, result));
      if (result.unlinked) toast(text.importUnlinked(result.unlinked));
      if (result.preferences === 'skipped') toast(text.importPreferencesSkipped);
    } catch (failure) {
      setError(serverMessage(failure) || text.importFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Clear the choice so the same file can be picked again after a failure.
          event.target.value = '';
          if (file) void load(file);
        }}
      />
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => input.current?.click()}>
        <Upload className="h-4 w-4" />
        {busy ? text.importing : label}
      </button>
      {error && <p role="alert" className="max-w-xs text-sm text-red-600">{error}</p>}
    </div>
  );
}
