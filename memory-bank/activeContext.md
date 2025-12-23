# Ders Takip Sistemi - Active Context

## Mevcut Durum

### Son Çalışma (2025-12-22/23 Session Özeti)
Bu session'da tema kalıcılığı, site yedekleme sistemi ve veritabanı senkronizasyon sorunları üzerinde çalışıldı:

#### 1. Tema Kalıcılığı ve Sunucu Senkronizasyonu ✅
- **Sorun**: Tema tercihleri (light/dark/system) ve özel birincil renk, oturum kapanıp açıldığında veya localStorage temizlendiğinde kayboluyordu.
- **Çözüm**:
  - `userPreferencesStore.ts`: `updatePreferences` içine `syncToServer` seçeneği eklendi (`authAPI.updateProfile` ile).
  - `userPreferencesStore.ts`: `syncWithServer` aksiyonu eklendi, backend'den gelen tercihleri yerel state ile birleştiriyor.
  - `settingsStore.ts`: `applyTheme` içinde kullanıcının `customPrimaryColor` ayarı varsa site geneli rengin üzerine yazılması engellendi.
  - `App.tsx`: Kullanıcı yüklenince `syncWithServer(user.preferences)` çağrılarak backend tercihleri senkronize ediliyor.
  - `index.html`: İlk yükleme betiği daha sağlam hale getirildi, kullanıcı tercihini öncelikle uyguluyor.
  - `auth.ts` (Frontend Types): `User.preferences` alanı `any` olarak genişletildi.

#### 2. Site Yedekleme ve Sıfırlama Sistemi ✅
- **Özellikler**:
  - **Backup Modeli**: `backend/src/models/Backup.ts` oluşturuldu (filename, path, size, type).
  - **backupController.ts**: `getBackups`, `createManualBackup`, `restoreBackup`, `resetData`, `performBackup` fonksiyonları.
  - **backupRoutes.ts**: Admin-only API rotaları (`/api/backup/*`).
  - **Otomatik Yedekleme (node-cron)**: Günlük, 5 günlük veya 7 günlük aralıklarla saat 03:00'te otomatik yedek.
  - **Son 5 Yedek Saklama**: Eski yedekler otomatik silinir.
  - **Geri Yükleme**: Seçilen yedek üzerinden veritabanı geri döndürülmesi.
  - **Veri Sıfırlama**:
    - `settings_only`: Kategoriler, planlar, konular, oturumlar, ayarlar silinir; kullanıcılar korunur.
    - `all`: Admin hariç tüm veriler silinir.
- **Frontend**:
  - `api.ts`: `backupAPI` eklendi.
  - `AdminSettingsPage.tsx`: "Yedekleme & Sıfırlama" sekmesi eklendi.
    - Yedekleme aralığı seçimi
    - "Şimdi Yedek Al" butonu
    - Yedek listesi tablosu (tarih, tip, boyut, geri yükle)
    - Veri sıfırlama butonları

#### 3. Veritabanı Senkronizasyon Sorunu Düzeltildi ✅
- **Sorun**: Sequelize `sync({ alter: true })` sırasında `study_sessions_backup` tablosunda UNIQUE constraint hatası.
- **Neden**: Önceki başarısız sync denemeleri _backup tabloları bırakmıştı.
- **Çözüm**: _backup tabloları temizlenerek sync başarılı hale getirildi.

### Önceki Session (2025-12-18)
- Haftalık Planlayıcı resize UX iyileştirmeleri
- Hafta değiştirme drop zone'ları
- Dashboard haftalık ilerleme grafiği güncellemesi
- Günlük görünüm senkronizasyonu (DailyCalendar.tsx)

## Şu Anki Odak Noktası

### Mevcut Durum Değerlendirmesi
**Çalışan Özellikler**:
- ✅ User authentication (login/register/logout)
- ✅ Kategori ve ders yönetimi (tüm kullanıcılar için)
- ✅ Konu oluşturma ve yönetimi
- ✅ Haftalık planlayıcı (drag & drop, week migration, resize UX)
- ✅ Pomodoro timer
- ✅ İstatistik ve grafikler
- ✅ Bildirim sistemi
- ✅ Dark/Light mode + Tema kalıcılığı
- ✅ Responsive design
- ✅ **Site Yedekleme & Geri Yükleme**
- ✅ **Otomatik Yedekleme (node-cron)**
- ✅ **Veri Sıfırlama Seçenekleri**

**Son Bug Fix'ler**:
- Tema tercihlerinin sunucu ile senkronizasyonu
- SQLite sync hataları (_backup tablo çakışması)
- Backend bağlantı reddedilme sorunu

### Aktif Geliştirme Alanları
1. **Sistem Stabilizasyonu**: Mevcut özelliklerin stabilizasyonu
2. **Kullanıcı Deneyimi**: UX iyileştirmeleri
3. **Performans Optimizasyonu**: Hız ve verimlilik artışı

## Önemli Kararlar ve Yaklaşımlar

### Technical Decisions
- **State Management**: Zustand (simple) + TanStack Query (server state)
- **Form Management**: React Hook Form + Zod validation
- **Styling**: TailwindCSS + Headless UI (accessibility)
- **Database**: SQLite (development simplicity)
- **Authentication**: JWT with refresh token pattern
- **Backup**: node-cron + fs-extra for scheduled file-based backups

### Development Patterns
- **Component Structure**: Functional components only, hooks-based
- **Error Handling**: Global error boundaries + local error states
- **API Design**: RESTful with consistent response format
- **Validation**: Client-side + server-side validation

## Bilinmesi Gereken Patterns

### Modal Pattern
```typescript
<AnimatePresence>
  {isOpen && (
    <Dialog as={motion.div} open={isOpen} onClose={handleClose}>
      <Dialog.Panel as={motion.div} className="flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="flex-shrink-0">Header</div>
          <div className="overflow-y-scroll flex-1">Content</div>
          <div className="flex-shrink-0">Footer</div>
        </form>
      </Dialog.Panel>
    </Dialog>
  )}
</AnimatePresence>
```

### API Call Pattern
```typescript
const mutation = useMutation({
  mutationFn: (data) => apiCall(data),
  onSuccess: () => {
    toast.success('İşlem başarılı');
    queryClient.invalidateQueries(['key']);
  },
  onError: (error) => {
    const message = error?.response?.data?.error?.message || 'Hata oluştu';
    toast.error(message);
  },
});
```

## Önemli Dosya Lokasyonları

### Key Components
- **CreateTopicModal**: `frontend/src/components/modals/CreateTopicModal.tsx`
- **CourseCreateModal**: `frontend/src/components/modals/CourseCreateModal.tsx`
- **CategoryManagementModal**: `frontend/src/components/modals/CategoryManagementModal.tsx`
- **WeeklyPlanner**: `frontend/src/components/planner/WeeklyPlanner.tsx`
- **DailyCalendar**: `frontend/src/components/planner/DailyCalendar.tsx`
- **AdminSettingsPage**: `frontend/src/pages/admin/AdminSettingsPage.tsx`

### Key Backend Files
- **topicController**: `backend/src/controllers/topicController.ts`
- **userController**: `backend/src/controllers/userController.ts`
- **backupController**: `backend/src/controllers/backupController.ts`
- **Models**: `backend/src/models/` (User, Course, Topic, StudySession, Backup)

### API Services
- **Main API**: `frontend/src/services/api.ts`
- **Backup API**: `frontend/src/services/api.ts` (backupAPI export)

## Önemli Insights ve Öğrenmeler

### Technical Insights
1. **React Hook Form + Zod**: Güçlü validation ama empty string handling'e dikkat
2. **TanStack Query**: Automatic caching ama cache invalidation stratejisi önemli
3. **SQLite**: Development için harika ama `sync({ alter: true })` _backup tabloları bırakabilir
4. **node-cron**: Zamanlanmış görevler için basit ve etkili

### User Experience Insights
1. **Modal Design**: Flex layout + max-height + overflow-y-scroll kombinasyonu ideal
2. **Color Selection**: Preset renkler custom color picker'dan daha kullanıcı dostu
3. **Form Validation**: Anlık feedback + Türkçe hata mesajları önemli
4. **Theme Persistence**: Hem localStorage hem backend senkronizasyonu gerekli

## Development Workflow Update (2025-12-23)
- Root `npm run dev:all` starts backend + frontend together (`npm run dev` is an alias).
- Frontend proxy and env now point to backend port 5002.
- Backup routes added at `/api/backup/*` (admin only).
- Settings model extended with 'backup' category.
