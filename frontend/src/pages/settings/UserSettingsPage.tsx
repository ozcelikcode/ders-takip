import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore, ThemeMode } from '../../store/userPreferencesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { authAPI } from '../../services/api';
import { User, Settings, Bell, Clock, Save, Eye, EyeOff, Check, Sun, Moon, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

type TabType = 'profile' | 'appearance' | 'notifications' | 'study';

const UserSettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user, setUser } = useAuthStore();
  const { preferences, updatePreferences, resetPreferences } = useUserPreferencesStore();
  const { settings: siteSettings } = useSettingsStore();

  // Profile Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Study Preferences State (local state to prevent instant updates)
  const [studyPrefs, setStudyPrefs] = useState({
    defaultPomodoroDuration: preferences.defaultPomodoroDuration,
    defaultShortBreak: preferences.defaultShortBreak,
    defaultLongBreak: preferences.defaultLongBreak,
    pomodorosUntilLongBreak: preferences.pomodorosUntilLongBreak,
    weeklyStudyGoal: preferences.weeklyStudyGoal,
    dailyStudyGoal: preferences.dailyStudyGoal,
    activeStudyDays: preferences.activeStudyDays || [1, 2, 3, 4, 5, 6, 0],
  });

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { fullName: string; email: string }) => authAPI.updateProfile(data),
    onSuccess: (response) => {
      const updatedUser = response.data?.data?.user;
      if (updatedUser) {
        setUser(updatedUser);
      }
      toast.success('Profil başarıyla güncellendi');
    },
    onError: () => {
      toast.error('Profil güncellenirken bir hata oluştu');
    },
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authAPI.changePassword(data),
    onSuccess: () => {
      toast.success('Şifre başarıyla değiştirildi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    },
    onError: () => {
      toast.error('Şifre değiştirilirken bir hata oluştu');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ fullName, email });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleThemeChange = (theme: ThemeMode) => {
    updatePreferences({ theme });
  };

  const handleColorChange = (color: string) => {
    updatePreferences({ customPrimaryColor: color });
  };

  const handlePreferenceChange = (key: string, value: any) => {
    updatePreferences({ [key]: value });
    toast.success('Tercih kaydedildi');
  };

  // Calculate if a color is light or dark for contrast
  const isLightColor = (hexColor: string): boolean => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'appearance', label: 'Görünüm', icon: Settings },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'study', label: 'Çalışma Tercihleri', icon: Clock },
  ];

  const predefinedColors = [
    { name: 'Mavi', value: '#3B82F6' },
    { name: 'Mor', value: '#8B5CF6' },
    { name: 'Yeşil', value: '#10B981' },
    { name: 'Kırmızı', value: '#EF4444' },
    { name: 'Turuncu', value: '#F59E0B' },
    { name: 'Pembe', value: '#EC4899' },
    { name: 'İndigo', value: '#6366F1' },
    { name: 'Turkuaz', value: '#14B8A6' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ayarlar</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Hesabınızı ve tercihlerinizi yönetin
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-4 px-1 border-b-3 font-semibold text-sm transition-colors ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-900 p-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profil Bilgileri</h2>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ad Soyad</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">E-posta</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rol</label>
                  <input
                    type="text"
                    value={user?.role === 'admin' ? 'Yönetici' : 'Öğrenci'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                    disabled
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {updateProfileMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </form>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Şifre Değiştir</h2>
              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Şifremi Değiştir
                </button>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mevcut Şifre</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Yeni Şifre</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Yeni Şifre (Tekrar)</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {changePasswordMutation.isPending ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tema</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'light', label: 'Açık Tema', IconComponent: Sun, description: 'Aydınlık görünüm' },
                  { value: 'dark', label: 'Koyu Tema', IconComponent: Moon, description: 'Karanlık görünüm' },
                  { value: 'system', label: 'Sistem', IconComponent: Monitor, description: 'Sistem ayarlarını kullan' },
                ].map((theme) => {
                  const ThemeIcon = theme.IconComponent;
                  return (
                    <button
                      key={theme.value}
                      onClick={() => handleThemeChange(theme.value as ThemeMode)}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${preferences.theme === theme.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
                        }`}
                    >
                      <ThemeIcon className={`w-10 h-10 mb-3 ${preferences.theme === theme.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'
                        }`} />
                      <div className="text-base font-semibold text-gray-900 dark:text-white mb-1">{theme.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{theme.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ana Renk Teması</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Sitenin ana rengini özelleştirin</p>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-6">
                {predefinedColors.map((color) => {
                  const isSelected = preferences.customPrimaryColor === color.value;
                  const isLight = isLightColor(color.value);
                  return (
                    <button
                      key={color.value}
                      onClick={() => handleColorChange(color.value)}
                      className="group relative flex flex-col items-center"
                      title={color.name}
                    >
                      <div
                        className={`w-14 h-14 rounded-xl transition-all shadow-md flex items-center justify-center ${isSelected
                            ? 'ring-4 ring-offset-2 ring-primary-400 dark:ring-primary-500 dark:ring-offset-gray-800 scale-110'
                            : 'hover:scale-110 hover:shadow-lg'
                          }`}
                        style={{ backgroundColor: color.value }}
                      >
                        {isSelected && <Check className={`w-7 h-7 ${isLight ? 'text-gray-900' : 'text-white'}`} strokeWidth={3} />}
                      </div>
                      <div className={`mt-2 text-xs font-medium text-center ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {color.name}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Özel Renk Seç</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={preferences.customPrimaryColor || siteSettings.primaryColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                        style={{ WebkitAppearance: 'none', border: 'none' }}
                      />
                      <div className="absolute inset-0 rounded-lg border-2 border-gray-300 dark:border-gray-600 pointer-events-none" />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={preferences.customPrimaryColor || siteSettings.primaryColor}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^#[0-9A-F]{6}$/i.test(value) || value === '') {
                            handleColorChange(value);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="#3B82F6"
                        pattern="^#[0-9A-F]{6}$"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  {preferences.customPrimaryColor && preferences.customPrimaryColor !== siteSettings.primaryColor && (
                    <button
                      onClick={() => handleColorChange(siteSettings.primaryColor)}
                      className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                    >
                      Varsayılana Dön
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Bildirim Tercihleri</h2>
            <div className="space-y-4">
              {[
                { key: 'emailNotifications', label: 'E-posta Bildirimleri', description: 'Önemli güncellemeler için e-posta al' },
                { key: 'pushNotifications', label: 'Push Bildirimleri', description: 'Tarayıcı bildirimlerini etkinleştir' },
                { key: 'taskReminders', label: 'Görev Hatırlatmaları', description: 'Yaklaşan çalışma seansları için hatırlatma al' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences[item.key as keyof typeof preferences] as boolean}
                      onChange={(e) => handlePreferenceChange(item.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Study Preferences Tab */}
        {activeTab === 'study' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Çalışma Tercihleri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Varsayılan Pomodoro Süresi (dk)</label>
                <input
                  type="number"
                  value={studyPrefs.defaultPomodoroDuration}
                  onChange={(e) => setStudyPrefs({ ...studyPrefs, defaultPomodoroDuration: parseInt(e.target.value) || 25 })}
                  min="1"
                  max="90"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kısa Mola Süresi (dk)</label>
                <input
                  type="number"
                  value={studyPrefs.defaultShortBreak}
                  onChange={(e) => setStudyPrefs({ ...studyPrefs, defaultShortBreak: parseInt(e.target.value) || 5 })}
                  min="1"
                  max="30"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Uzun Mola Süresi (dk)</label>
                <input
                  type="number"
                  value={studyPrefs.defaultLongBreak}
                  onChange={(e) => setStudyPrefs({ ...studyPrefs, defaultLongBreak: parseInt(e.target.value) || 15 })}
                  min="1"
                  max="60"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Uzun Molaya Kadar Pomodoro Sayısı</label>
                <input
                  type="number"
                  value={studyPrefs.pomodorosUntilLongBreak}
                  onChange={(e) => setStudyPrefs({ ...studyPrefs, pomodorosUntilLongBreak: parseInt(e.target.value) || 4 })}
                  min="2"
                  max="10"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Haftalık Çalışma Hedefi (saat)</label>
                <input
                  type="number"
                  value={studyPrefs.weeklyStudyGoal}
                  onChange={(e) => setStudyPrefs({ ...studyPrefs, weeklyStudyGoal: parseInt(e.target.value) || 20 })}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Günlük Çalışma Hedefi (saat)</label>
                <input
                  type="number"
                  value={studyPrefs.dailyStudyGoal}
                  onChange={(e) => setStudyPrefs({ ...studyPrefs, dailyStudyGoal: parseInt(e.target.value) || 4 })}
                  min="1"
                  max="24"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Aktif Çalışma Günleri</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 1, name: 'Pzt' },
                    { id: 2, name: 'Sal' },
                    { id: 3, name: 'Çar' },
                    { id: 4, name: 'Per' },
                    { id: 5, name: 'Cum' },
                    { id: 6, name: 'Cmt' },
                    { id: 0, name: 'Paz' },
                  ].map((day) => {
                    const isActive = studyPrefs.activeStudyDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          const newDays = isActive
                            ? studyPrefs.activeStudyDays.filter((id) => id !== day.id)
                            : [...studyPrefs.activeStudyDays, day.id];
                          setStudyPrefs({ ...studyPrefs, activeStudyDays: newDays });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive
                            ? 'bg-primary-600 text-white shadow-md scale-105'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                      >
                        {day.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  updatePreferences(studyPrefs);
                  toast.success('Çalışma tercihleri kaydedildi');
                }}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
              <button
                onClick={() => {
                  resetPreferences();
                  setStudyPrefs({
                    defaultPomodoroDuration: 25,
                    defaultShortBreak: 5,
                    defaultLongBreak: 15,
                    pomodorosUntilLongBreak: 4,
                    weeklyStudyGoal: 20,
                    dailyStudyGoal: 4,
                    activeStudyDays: [1, 2, 3, 4, 5, 6, 0],
                  });
                  toast.success('Tercihler varsayılanlara sıfırlandı');
                }}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Tüm Tercihleri Sıfırla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSettingsPage;
