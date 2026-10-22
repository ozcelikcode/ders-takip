import { searchLimit, searchQuerySchema, dateKeyInZone } from '@study-tracker/contracts';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useTerms } from '../../hooks/useTerms';
import { searchAPI } from '../../services/api';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useText } from '../../store/languageStore';


function ResultGroup({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const text = useText().search;
  return (
    <section className="panel min-w-0" aria-label={title}>
      <div className="panel-heading">
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-(--muted)">
          {text.count(count, searchLimit)}
        </span>
      </div>
      {count === 0 ? (
        <p className="p-5 text-sm text-(--muted)">{text.noMatch}</p>
      ) : (
        <ul className="divide-y divide-(--line)">{children}</ul>
      )}
    </section>
  );
}

const rowClass = 'flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm hover:bg-(--subtle)';

export default function SearchPage() {
  const { session: sessionText, search: text } = useText();
  const t = useTerms();
  const keys = useAccountQueryKeys();
  const timezone = useUserPreferencesStore((state) => state.preferences.timezone);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const valid = searchQuerySchema.safeParse({ q: query });
  const results = useQuery({
    queryKey: keys.resource('search', query.trim()),
    queryFn: () => searchAPI.search(query.trim()),
    enabled: valid.success,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={text.title}
        description={text.description(t)}
      />
      <form
        role="search"
        className="relative max-w-lg"
        onSubmit={(event) => {
          event.preventDefault();
          setParams(draft.trim() ? { q: draft.trim() } : {});
        }}
      >
        <label htmlFor="search-page-input" className="sr-only">{text.label}</label>
        <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-(--muted)" />
        <input
          id="search-page-input"
          type="search"
          className="input pl-9"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={text.placeholder}
        />
      </form>

      {!query ? (
        <p className="text-sm text-(--muted)">{text.prompt}</p>
      ) : !valid.success ? (
        <p role="alert" className="text-sm text-red-600">{valid.error.issues[0]?.message}</p>
      ) : results.isPending ? (
        <p role="status" className="text-sm text-(--muted)">{text.searching}</p>
      ) : results.isError ? (
        <div role="alert" className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
          {text.failed}
          <button type="button" className="btn btn-secondary" onClick={() => void results.refetch()}>{text.retry}</button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <ResultGroup title={t.course({ capitalize: true, plural: true })} count={results.data.courses.length}>
            {results.data.courses.map((course) => (
              <li key={course.id}>
                <Link to={`/courses/${course.id}`} className={rowClass}>
                  <span className="font-medium">{course.name}</span>
                  <span className="text-xs text-(--muted)">
                    {[course.categoryName, course.isActive ? null : text.inactive].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ResultGroup>
          <ResultGroup title={t.topic({ capitalize: true, plural: true })} count={results.data.topics.length}>
            {results.data.topics.map((topic) => (
              <li key={topic.id}>
                <Link to={`/courses/${topic.courseId}`} className={rowClass}>
                  <span className="font-medium">{topic.name}</span>
                  <span className="text-xs text-(--muted)">{topic.courseName}</span>
                </Link>
              </li>
            ))}
          </ResultGroup>
          <ResultGroup title={t.session({ capitalize: true, plural: true })} count={results.data.sessions.length}>
            {results.data.sessions.map((session) => {
              const day = dateKeyInZone(session.startTime, timezone);
              return (
                <li key={session.id}>
                  <Link to={`/planner?date=${day}`} className={rowClass}>
                    <span className="font-medium">{session.title}</span>
                    <span className="text-xs text-(--muted)">
                      {day} · {sessionText.statuses[session.status]} · {text.matchedIn[session.matchedIn]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ResultGroup>
        </div>
      )}
    </div>
  );
}
