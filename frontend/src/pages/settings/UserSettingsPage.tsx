import { defaultPreferences, resolveTerminology } from '@study-tracker/contracts';
import type { PreferencesPatch } from '@study-tracker/contracts';
import PageHeader from '../../components/common/PageHeader';
import { useEffect, useRef, useState } from 'react';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useUserPreferencesStore, ThemeMode } from '../../store/userPreferencesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Bell, CalendarDays, Settings, Clock, Globe, User } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AccountTab from './account/AccountTab';
import toast from 'react-hot-toast';
import AppearanceTab from './AppearanceTab';
import RegionTab from './RegionTab';
import NotificationsTab from './NotificationsTab';
import CalendarTab from './CalendarTab';
import StudyTab, { type StudyPreferencesDraft } from './StudyTab';
import { useText } from '../../store/languageStore';

type TabType = 'account' | 'appearance' | 'region' | 'study' | 'notifications' | 'calendar';

const tabs = [
  { id: 'account', icon: User },
  { id: 'appearance', icon: Settings },
  { id: 'region', icon: Globe },
  { id: 'study', icon: Clock },
  { id: 'notifications', icon: Bell },
  { id: 'calendar', icon: CalendarDays },
] as const;
const isTab = (value: string | null): value is TabType => tabs.some((tab) => tab.id === value);

const studyDraftFrom = (preferences: typeof defaultPreferences): StudyPreferencesDraft => ({
  defaultPomodoroDuration: preferences.defaultPomodoroDuration,
  defaultShortBreak: preferences.defaultShortBreak,
  defaultLongBreak: preferences.defaultLongBreak,
  pomodorosUntilLongBreak: preferences.pomodorosUntilLongBreak,
  dailyStudyGoal: preferences.dailyStudyGoal,
  activeStudyDays: preferences.activeStudyDays ? [...preferences.activeStudyDays] : [1, 2, 3, 4, 5, 6, 0],
});

const UserSettingsPage = () => {
  const text = useText().settings;
  // The open tab lives in the address (`?tab=calendar`), so a link or the page switcher can open it directly.
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const activeTab: TabType = isTab(requested) ? requested : 'account';
  const setActiveTab = (tab: TabType) => setParams(tab === 'account' ? {} : { tab }, { replace: true });
  const { preferences, updatePreferences, resetPreferences, pending, error: preferencesError } = useUserPreferencesStore();
  const { settings: siteSettings } = useSettingsStore();

  // Study preferences stay local until saved to prevent instant updates.
  const [studyPrefs, setStudyPrefs] = useState(() => studyDraftFrom(preferences));
  // The stored values the draft started from: a refresh replaces the draft only while it is unedited.
  const [studyBaseline, setStudyBaseline] = useState(studyPrefs);
  const baselineRef = useRef(studyBaseline);
  useUnsavedChangesWarning(JSON.stringify(studyPrefs) !== JSON.stringify(studyBaseline));

  useEffect(() => {
    const previous = baselineRef.current;
    const next = studyDraftFrom(preferences);
    setStudyPrefs((draft) => (JSON.stringify(draft) === JSON.stringify(previous) ? next : draft));
    baselineRef.current = next;
    setStudyBaseline(next);
  }, [
    preferences.defaultPomodoroDuration,
    preferences.defaultShortBreak,
    preferences.defaultLongBreak,
    preferences.pomodorosUntilLongBreak,
    preferences.dailyStudyGoal,
    preferences.activeStudyDays,
  ]);

  const savePreferences = async (patch: PreferencesPatch) => {
    try { await updatePreferences(patch); toast.success(text.saved); }
    catch { toast.error(text.saveFailed); }
  };
  const handleThemeChange = (theme: ThemeMode) => { void savePreferences({ theme }); };
  const handleColorChange = (color: string | null) => { void savePreferences({ customPrimaryColor: color || null }); };
  const resetStudyPreferences = () => {
    void resetPreferences().then(() => {
      setStudyPrefs(studyDraftFrom(defaultPreferences));
      toast.success(text.resetDone);
    }).catch(() => toast.error(text.resetFailed));
  };

  return (
    <div className="space-y-6">
      <PageHeader title={text.title} description={text.description} />
      <div role="status" aria-live="polite" className="text-xs text-(--muted)">{pending ? text.saving : preferencesError || text.storedInAccount}</div>

      <nav aria-label={text.sections} className="flex flex-wrap gap-1 border-b border-(--line) pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-item w-auto whitespace-nowrap ${activeTab === tab.id ? 'nav-item-active' : ''}`}
            >
              <Icon className="h-4 w-4" />
              {text.tabs[tab.id]}
            </button>
          );
        })}
      </nav>

      {/* The account tab is a set of its own panels; the preference tabs share one. */}
      {activeTab === 'account' ? <AccountTab /> : (
      <div className="panel p-5 sm:p-6">
        {activeTab === 'appearance' && (
          <AppearanceTab
            preferences={preferences}
            sitePrimaryColor={siteSettings.primaryColor}
            siteTerminology={resolveTerminology({}, siteSettings, siteSettings.language)}
            onThemeChange={handleThemeChange}
            onColorChange={handleColorChange}
            onTerminologySave={(patch) => void savePreferences(patch)}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsTab preferences={preferences} onSave={(patch) => void savePreferences(patch)} />
        )}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'region' && (
          <RegionTab preferences={preferences} onSave={(patch) => void savePreferences(patch)} />
        )}
        {activeTab === 'study' && (
          <StudyTab
            studyPrefs={studyPrefs}
            setStudyPrefs={setStudyPrefs}
            pending={pending}
            onSave={() => { void savePreferences(studyPrefs); }}
            onReset={resetStudyPreferences}
            onRestartOnboarding={() => void savePreferences({ onboarding: 'pending' })}
          />
        )}
      </div>
      )}
    </div>
  );
};

export default UserSettingsPage;
