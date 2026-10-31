import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { foldSearchText } from '@study-tracker/contracts';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTerms } from '../../hooks/useTerms';
import { useAuthStore } from '../../store/authStore';
import { useText } from '../../store/languageStore';

interface Destination { label: string; group: string; href: string }

// Tab and section ids follow the catalogs, which name every tab of the settings pages.
const keys = <T extends object>(names: T) => Object.keys(names) as (keyof T & string)[];

/** Every page and settings tab the person may open, in sidebar order. */
function useDestinations(): Destination[] {
  const t = useTerms();
  const { nav, settings, siteSettings } = useText();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const to = (group: string) => (label: string, href: string): Destination => ({ label, group, href });
  const workspace = to(nav.workspace);
  const account = to(nav.account);
  const settingsTab = to(nav.settings);
  const admin = to(nav.admin);
  const siteSection = to(nav.siteSettings);
  return [
    workspace(nav.overview, '/dashboard'),
    workspace(nav.planner, '/planner'),
    workspace(nav.stats, '/stats'),
    workspace(nav.records(t), '/courses'),
    workspace(nav.pomodoro, '/pomodoro'),
    workspace(nav.search, '/search'),
    account(nav.settings, '/settings'),
    ...keys(settings.tabs).map((tab) => settingsTab(settings.tabs[tab], `/settings?tab=${tab}`)),
    ...(isAdmin
      ? [
          admin(nav.adminOverview, '/admin'),
          admin(nav.users, '/admin/users'),
          admin(nav.recordManagement(t), '/admin/courses'),
          admin(nav.siteSettings, '/admin/settings'),
          ...keys(siteSettings.sections).map((section) => siteSection(siteSettings.sections[section], `/admin/settings?section=${section}`)),
        ]
      : []),
  ];
}

/** Every word of the query must appear in the destination's name or group, ignoring case and Turkish letter forms. */
const matching = (destinations: Destination[], query: string) => {
  const words = foldSearchText(query).split(/\s+/).filter(Boolean);
  return destinations.filter((destination) => {
    const haystack = foldSearchText(`${destination.label} ${destination.group}`);
    return words.every((word) => haystack.includes(word));
  });
};

/** Opens any page or settings tab by name. Mounted only while open; `usePaletteShortcut` opens and closes it. */
export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const text = useText().palette;
  const navigate = useNavigate();
  const destinations = useDestinations();
  const [query, setQuery] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const results = matching(destinations, query);

  useEffect(() => {
    // Headless UI leaves focus alone on touch devices; the palette exists to be typed into, so focus its field.
    const frame = requestAnimationFrame(() => field.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center p-4 pt-[12vh]">
        <DialogPanel className="panel w-full max-w-lg overflow-hidden shadow-xl">
          <DialogTitle className="sr-only">{text.title}</DialogTitle>
          <Combobox
            onChange={(destination: Destination | null) => {
              if (!destination) return;
              onClose();
              navigate(destination.href);
            }}
          >
            <div className="flex items-center gap-2 border-b border-(--line) px-4">
              <Search className="h-4 w-4 shrink-0 text-(--muted)" aria-hidden="true" />
              <ComboboxInput
                ref={field}
                autoFocus
                aria-label={text.inputLabel}
                placeholder={text.placeholder}
                className="h-12 w-full bg-transparent text-sm outline-hidden"
                onChange={(event) => setQuery(event.target.value)}
                // The combobox would spend the first Escape on itself; here Escape always closes the palette.
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') return;
                  event.preventDefault();
                  onClose();
                }}
              />
            </div>
            <ComboboxOptions static className="max-h-80 overflow-y-auto p-2 empty:hidden">
              {results.map((destination) => (
                <ComboboxOption
                  key={destination.href}
                  value={destination}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-focus:bg-(--subtle)"
                >
                  <span>{destination.label}</span>
                  <span className="text-xs text-(--muted)">{destination.group}</span>
                </ComboboxOption>
              ))}
            </ComboboxOptions>
            {!results.length && <p className="px-4 py-6 text-center text-sm text-(--muted)">{text.empty}</p>}
          </Combobox>
          <p className="border-t border-(--line) px-4 py-2 text-xs text-(--muted)">{text.hint}</p>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
