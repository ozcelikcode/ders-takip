import { defaultPreferences } from '@study-tracker/contracts';
import type { PreferencesPatch } from '@study-tracker/contracts';
import PageHeader from '../../components/common/PageHeader';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore, ThemeMode } from '../../store/userPreferencesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { User, Settings, Clock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import AppearanceTab from './AppearanceTab';
import RegionTab from './RegionTab';
import ProfileTab from './ProfileTab';
import StudyTab, { type StudyPreferencesDraft } from './StudyTab';
import { useProfileSettings } from './useProfileSettings';

type TabType = 'profile' | 'appearance' | 'region' | 'study';

const tabs = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'appearance', label: 'Görünüm', icon: Settings },
  { id: 'region', label: 'Bölge', icon: Globe },
  { id: 'study', label: 'Çalışma Tercihleri', icon: Clock },
];

const studyDraftFrom = (preferences: typeof defaultPreferences): StudyPreferencesDraft => ({
  defaultPomodoroDuration: preferences.defaultPomodoroDuration,
  defaultShortBreak: preferences.defaultShortBreak,
  defaultLongBreak: preferences.defaultLongBreak,
  pomodorosUntilLongBreak: preferences.pomodorosUntilLongBreak,
  weeklyStudyGoal: preferences.weeklyStudyGoal,
  dailyStudyGoal: preferences.dailyStudyGoal,
  activeStudyDays: preferences.activeStudyDays ? [...preferences.activeStudyDays] : [1, 2, 3, 4, 5, 6, 0],
});

const UserSettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user } = useAuthStore();
  const { preferences, updatePreferences, resetPreferences, pending, error: preferencesError } = useUserPreferencesStore();
  const { settings: siteSettings } = useSettingsStore();
  const profileForm = useProfileSettings();

  // Study preferences stay local until saved to prevent instant updates.
  const [studyPrefs, setStudyPrefs] = useState(() => studyDraftFrom(preferences));

  useEffect(() => {
    setStudyPrefs(studyDraftFrom(preferences));
  }, [
    preferences.defaultPomodoroDuration,
    preferences.defaultShortBreak,
    preferences.defaultLongBreak,
    preferences.pomodorosUntilLongBreak,
    preferences.weeklyStudyGoal,
    preferences.dailyStudyGoal,
    preferences.activeStudyDays,
  ]);

  const savePreferences = async (patch: PreferencesPatch) => {
    try { await updatePreferences(patch); toast.success('Tercihler kaydedildi'); }
    catch { toast.error('Tercihler kaydedilemedi'); }
  };
  const handleThemeChange = (theme: ThemeMode) => { void savePreferences({ theme }); };
  const handleColorChange = (color: string | null) => { void savePreferences({ customPrimaryColor: color || null }); };
  const resetStudyPreferences = () => {
    void resetPreferences().then(() => {
      setStudyPrefs(studyDraftFrom(defaultPreferences));
      toast.success('Tercihler varsayılanlara sıfırlandı');
    }).catch(() => toast.error('Tercihler sıfırlanamadı'));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" description="Hesabını, görünümü ve çalışma tercihlerini yönet." />
      <div role="status" aria-live="polite" className="text-xs text-[var(--muted)]">{pending ? 'Tercihler kaydediliyor…' : preferencesError || 'Tercihler hesabınızda saklanır'}</div>

      <nav aria-label="Ayar bölümleri" className="flex flex-wrap gap-1 border-b border-[var(--line)] pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`nav-item w-auto whitespace-nowrap ${activeTab === tab.id ? 'nav-item-active' : ''}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="panel p-5 sm:p-6">
        {activeTab === 'profile' && <ProfileTab user={user} form={profileForm} />}
        {activeTab === 'appearance' && (
          <AppearanceTab
            preferences={preferences}
            sitePrimaryColor={siteSettings.primaryColor}
            onThemeChange={handleThemeChange}
            onColorChange={handleColorChange}
          />
        )}
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
          />
        )}
      </div>
    </div>
  );
};

export default UserSettingsPage;
