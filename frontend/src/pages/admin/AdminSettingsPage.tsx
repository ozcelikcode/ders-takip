import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Save, Globe, Mail, Shield, Palette, Bell,
  GraduationCap, BookOpen, Calendar as CalendarIcon, Clock, Trophy, Target, Lightbulb, School, ClipboardList, Users
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/settingsStore';

const siteSettingsSchema = z.object({
  siteName: z.string().min(1, 'Site adı gereklidir'),
  siteDescription: z.string().min(1, 'Site açıklaması gereklidir'),
  siteUrl: z.string().url('Geçerli bir URL girin'),
  adminEmail: z.string().email('Geçerli bir email girin'),
  siteLogo: z.string().optional(),
  siteIcon: z.string().optional(),
  allowRegistration: z.boolean(),
  maintenanceMode: z.boolean(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  primaryColor: z.string(),
});

type SiteSettingsForm = z.infer<typeof siteSettingsSchema>;

const AdminSettingsPage = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'appearance'>('general');
  const { settings, fetchSettings, updateSettings } = useSettingsStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<SiteSettingsForm>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: settings,
  });

  // Fetch settings on mount
  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update form when settings change
  React.useEffect(() => {
    reset(settings);
  }, [settings, reset]);

  const siteIcons = [
    { id: 'GraduationCap', icon: GraduationCap },
    { id: 'BookOpen', icon: BookOpen },
    { id: 'Calendar', icon: CalendarIcon },
    { id: 'Clock', icon: Clock },
    { id: 'Trophy', icon: Trophy },
    { id: 'Target', icon: Target },
    { id: 'Lightbulb', icon: Lightbulb },
    { id: 'School', icon: School },
    { id: 'ClipboardList', icon: ClipboardList },
    { id: 'Users', icon: Users },
  ];

  const onSubmit = async (data: SiteSettingsForm) => {
    try {
      await updateSettings(data);
      toast.success('Site ayarları güncellendi ve uygulandı');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Ayarlar güncellenirken hata oluştu');
    }
  };

  const tabs = [
    { id: 'general', name: 'Genel', icon: Globe },
    { id: 'security', name: 'Güvenlik', icon: Shield },
    { id: 'notifications', name: 'Bildirimler', icon: Bell },
    { id: 'appearance', name: 'Görünüm', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Site Ayarları</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sistem genelinde geçerli ayarları yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-body p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-colors ${activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="card">
              <div className="card-body space-y-6">
                {/* General Settings */}
                {activeTab === 'general' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Genel Ayarlar</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Site Adı *
                        </label>
                        <input
                          {...register('siteName')}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.siteName && (
                          <p className="mt-1 text-sm text-red-600">{errors.siteName.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Site URL *
                        </label>
                        <input
                          {...register('siteUrl')}
                          type="url"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.siteUrl && (
                          <p className="mt-1 text-sm text-red-600">{errors.siteUrl.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Site Açıklaması *
                      </label>
                      <textarea
                        {...register('siteDescription')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      {errors.siteDescription && (
                        <p className="mt-1 text-sm text-red-600">{errors.siteDescription.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Admin Email *
                        </label>
                        <input
                          {...register('adminEmail')}
                          type="email"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.adminEmail && (
                          <p className="mt-1 text-sm text-red-600">{errors.adminEmail.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Site Logosu (URL)
                        </label>
                        <input
                          {...register('siteLogo')}
                          type="text"
                          placeholder="https://example.com/logo.png"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Site İkonu
                      </label>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {siteIcons.map((item) => {
                          const Icon = item.icon;
                          const isSelected = watch('siteIcon') === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setValue('siteIcon', item.id, { shouldDirty: true })}
                              className={`p-2 rounded-md border flex items-center justify-center transition-all ${isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-300'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600'
                                }`}
                            >
                              <Icon className="w-5 h-5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Security Settings */}
                {activeTab === 'security' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Güvenlik Ayarları</h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Yeni Kayıtlara İzin Ver</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Kullanıcıların sisteme kayıt olmasına izin ver</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            {...register('allowRegistration')}
                            type="checkbox"
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Bakım Modu</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Siteyi bakım moduna al (sadece adminler erişebilir)</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            {...register('maintenanceMode')}
                            type="checkbox"
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Notification Settings */}
                {activeTab === 'notifications' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bildirim Ayarları</h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-blue-500" />
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Email Bildirimleri</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Sistem genelinde email bildirimlerini etkinleştir</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            {...register('emailNotifications')}
                            type="checkbox"
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-green-500" />
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Push Bildirimleri</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Tarayıcı push bildirimlerini etkinleştir</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            {...register('pushNotifications')}
                            type="checkbox"
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Appearance Settings */}
                {activeTab === 'appearance' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Görünüm Ayarları</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Ana Renk
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            {...register('primaryColor')}
                            type="color"
                            className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                          />
                          <input
                            {...register('primaryColor')}
                            type="text"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={!isDirty}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;