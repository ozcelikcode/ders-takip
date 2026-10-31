import { formatMeasuredSeconds } from '@study-tracker/contracts';
import { useQuery } from '@tanstack/react-query';
import { Award, Flame } from 'lucide-react';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useWeekStart } from '../../hooks/useWeekStart';
import { useLocale } from '../../lib/locale';
import { studySessionsAPI } from '../../services/api';
import { useText } from '../../store/languageStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { badgeIds, earnedBadges, heatColumns, heatLevel, lastDays, streaks } from './consistency';

const yearDays = 365;
// Neutral steps from an empty cell to the strongest; the drawing is decorative, the summary text carries the meaning.
const levelClass = ['bg-(--subtle)', 'bg-(--solid)/25', 'bg-(--solid)/50', 'bg-(--solid)/75', 'bg-(--solid)'];

/** Streaks, a year heat map and badges, all from measured study only. */
export default function ConsistencySection({ today }: { today: string }) {
  const text = useText().stats;
  const { language, tag } = useLocale();
  const keys = useAccountQueryKeys();
  const weekStart = useWeekStart();
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const range = { startDate: lastDays(today, yearDays)[0]!, endDate: today };
  const year = useQuery({
    queryKey: keys.sessions('consistency', range.startDate, range.endDate),
    queryFn: async () => (await studySessionsAPI.getStats(range)).data.data?.stats,
  });
  const allTime = useQuery({
    queryKey: keys.sessions('consistency-total'),
    queryFn: async () => (await studySessionsAPI.getStats()).data.data?.stats,
  });

  if (year.isPending || allTime.isPending) return null;
  if (year.isError || allTime.isError || !year.data || !allTime.data)
    return <p role="alert" className="text-sm text-red-600">{text.consistencyFailed}</p>;

  const measured = new Map(year.data.days.map((entry) => [entry.date, entry.studySeconds]));
  const days = lastDays(today, yearDays).map((date) => ({ date, studySeconds: measured.get(date) ?? 0 }));
  const { current, longest } = streaks(days, today, preferences.activeStudyDays);
  const badges = earnedBadges(days, allTime.data.studySeconds, longest, preferences);
  const studiedDays = days.filter((entry) => entry.studySeconds > 0).length;
  const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(tag, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  return (
    <section className="panel min-w-0" aria-labelledby="consistency-heading">
      <div className="panel-heading">
        <h2 id="consistency-heading" className="text-sm font-medium">{text.consistency}</h2>
      </div>
      <div className="space-y-6 p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            { label: text.currentStreak, value: current },
            { label: text.longestStreak, value: longest },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <Flame aria-hidden="true" className="h-5 w-5 shrink-0 text-(--muted)" />
              <div>
                <dt className="text-xs text-(--muted)">{item.label}</dt>
                <dd className="text-lg font-medium tabular-nums">{text.streakDays(item.value)}</dd>
              </div>
            </div>
          ))}
        </dl>
        <p className="text-xs text-(--muted)">{text.streakHint}</p>

        <div>
          <h3 className="mb-2 text-sm font-medium">{text.heatmap}</h3>
          <p className="sr-only">{text.heatmapSummary(studiedDays, yearDays)}</p>
          <div className="overflow-x-auto pb-1" aria-hidden="true">
            <div className="flex w-max gap-[3px]">
              {heatColumns(days, weekStart).map((column, index) => (
                <div key={index} className="flex flex-col gap-[3px]">
                  {column.map((cell, row) =>
                    cell ? (
                      <span
                        key={cell.date}
                        title={text.heatCell(dateLabel(cell.date), formatMeasuredSeconds(cell.studySeconds, language))}
                        className={`h-[11px] w-[11px] rounded-[2px] ${levelClass[heatLevel(cell.studySeconds)]}`}
                      />
                    ) : (
                      <span key={`pad-${row}`} className="h-[11px] w-[11px]" />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-(--muted)" aria-hidden="true">
            {text.heatmapLegend.map((label, level) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`h-[11px] w-[11px] rounded-[2px] ${levelClass[level]}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">{text.badges}</h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {badgeIds.map((id) => (
              <li key={id} className="flex items-start gap-3 rounded-md border border-(--line) p-3">
                <Award aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{text.badgeNames[id]}</p>
                  <p className="text-xs text-(--muted)">{text.badgeHints[id]}</p>
                  <p className="mt-1 text-xs">{badges[id] ? text.badgeEarned : text.badgeLocked}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
