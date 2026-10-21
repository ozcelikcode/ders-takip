import { defaultPreferences } from '@study-tracker/contracts';
import type { PreferencesPatch } from '@study-tracker/contracts';
import PageHeader from '../../components/common/PageHeader';
import { useEffect, useState } from 'react';
import { useUserPreferencesStore, ThemeMode } from '../../store/userPreferencesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Bell, Settings, Clock, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppearanceTab from './AppearanceTab';
import RegionTab from './RegionTab';
import NotificationsTab from './NotificationsTab';
import StudyTab, { type StudyPreferencesDraft } from './StudyTab';

type TabType = 'appearance' | 'region' | 'study' | 'notifications';

const tabs = [
  { id: 'appearance', label: 'Görünüm', icon: Settings },
  { id: 'region', label: 'Bölge', icon: Globe },
  { id: 'study', label: 'Çalışma Tercihleri', icon: Clock },
  { id: 'notifications', label: 'Bildirimler', icon: Bell },
];

const studyDraftFrom = (preferences: typeof defaultPreferences): StudyPreferencesDraft => ({
  defaultPomodoroDuration: preferences.defaultPomodoroDuration,
  defaultShortBreak: preferences.defaultShortBreak,
  defaultLongBreak: preferences.defaultLongBreak,
  pomodorosUntilLongBreak: preferences.pomodorosUntilLongBreak,
  dailyStudyGoal: preferences.dailyStudyGoal,
  activeStudyDays: preferences.activeStudyDays ? [...preferences.activeStudyDays] : [1, 2, 3, 4, 5, 6, 0],
});

const UserSettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const { preferences, updatePreferences, resetPreferences, pending, error: preferencesError } = useUserPreferencesStore();
  const { settings: siteSettings } = useSettingsStore();

  // Study preferences stay local until saved to prevent instant updates.
  const [studyPrefs, setStudyPrefs] = useState(() => studyDraftFrom(preferences));

  useEffect(() => {
    setStudyPrefs(studyDraftFrom(preferences));
  }, [
    preferences.defaultPomodoroDuration,
    preferences.defaultShortBreak,
    preferences.defaultLongBreak,
    preferences.pomodorosUntilLongBreak,
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
      <PageHeader title="Ayarlar" description="Görünümü, kelimeleri, bölge ayarlarını, çalışma tercihlerini ve bildirimleri yönet." />
      <p className="text-sm text-(--muted)">
        Ad, kullanıcı adı, profil resmi ve şifre{' '}
        <Link to="/profile" className="font-medium text-(--text) underline underline-offset-4">Profil</Link> sayfasındadır.
      </p>
      <div role="status" aria-live="polite" className="text-xs text-(--muted)">{pending ? 'Tercihler kaydediliyor…' : preferencesError || 'Tercihler hesabınızda saklanır'}</div>

      <nav aria-label="Ayar bölümleri" className="flex flex-wrap gap-1 border-b border-(--line) pb-3">
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
        {activeTab === 'appearance' && (
          <AppearanceTab
            preferences={preferences}
            sitePrimaryColor={siteSettings.primaryColor}
            siteTerminologyPreset={siteSettings.terminologyPreset}
            onThemeChange={handleThemeChange}
            onColorChange={handleColorChange}
            onTerminologyChange={(terminologyPreset) => void savePreferences({ terminologyPreset })}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsTab preferences={preferences} onSave={savePreferences} />
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
            onRestartOnboarding={() => void savePreferences({ onboarding: 'pending' })}
          />
        )}
      </div>
    </div>
  );
};

export default UserSettingsPage;
