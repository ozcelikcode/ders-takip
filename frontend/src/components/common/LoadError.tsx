import { useText } from '../../store/languageStore';

/** A failed load with a way to ask again; the button waits while a request is already running. */
export default function LoadError({ message, query, className = 'text-sm' }: {
  message: string;
  query: { refetch: () => unknown; isFetching: boolean };
  className?: string;
}) {
  const text = useText().common;
  return (
    <div role="alert" className={`flex flex-wrap items-center gap-3 ${className}`}>
      <p className="text-red-600 dark:text-red-400">{message}</p>
      <button type="button" className="btn btn-secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>
        {text.retry}
      </button>
    </div>
  );
}
