# Ders Takip Sistemi - Active Context

## Mevcut Durum

### Son Çalışma (2025-12-25 Session Özeti)
Bu session'da Planner sayfasının UI/UX tasarımı tamamen yenilendi:

#### 1. iOS Tarzı Modern Tasarım Sistemi ✅
- **Renk Paleti**: Pembe/magenta tonlarından sky blue/cyan gradient'e geçiş
- **Glassmorphism**: `backdrop-blur-xl`, `bg-white/80`, yarı saydam border'lar
- **Yuvarlatılmış köşeler**: `rounded-2xl`, `rounded-xl` kullanımı
- **Yumuşak gölgeler**: `shadow-sm`, `shadow-lg`, `shadow-xl` gradyanları
- **Animasyonlar**: `animate-fade-in`, smooth transition'lar, framer-motion entegrasyonu

#### 2. Haftalık/Günlük Planlayıcı Güncellemeleri ✅
- **Bugünün sütunu**: `bg-gradient-to-b from-sky-50 via-cyan-50/80 to-blue-50/60`
- **Tarih badge'leri**: Aktif günler için pastel arka plan ile rounded-full stil
- **Grid**: Glassmorphism efektli kart (`rounded-2xl`, `backdrop-blur-xl`)
- **Navigasyon**: iOS tarzı segmented control stili
- **Legend kaldırıldı**: Çalışma/Pomodoro/Tekrar/Mola legend'ı artık gösterilmiyor

#### 3. CreateSessionModal Güncellemesi ✅
- **Modern modal**: Glassmorphism, `rounded-2xl`, soft border'lar
- **Kategori butonları**: `rounded-xl`, büyük iconlar, pastel renkler
- **Renk paleti**: Pastel/soft iOS tarzı renkler (400 serisi tailwind renkleri)
- **Form elemanları**: Modern input stilleri

#### 4. Bugünün Planları (GoalsOverview) Güncellemesi ✅
- **Header**: Icon container'lı modern tasarım
- **Kartlar**: Glassmorphism efektli session kartları
- **Status badge'leri**: Pastel renkler, soft border'lar
- **Gradient butonlar**: `bg-gradient-to-r from-sky-500 to-blue-500`

### Önceki Session (2025-12-22/23)
- Tema kalıcılığı ve sunucu senkronizasyonu
- Site yedekleme sistemi
- Veritabanı senkronizasyon sorunu düzeltildi

## Tasarım Yaklaşımı (Design System)

### Renkler ve Tonlar
```
PRIMARY ACCENT COLORS (Soft/Pastel):
- Sky Blue: sky-400 (#60A5FA), sky-500 (#38BDF8)
- Cyan: cyan-400 (#22D3EE), cyan-50 (backgrounds)
- Emerald: emerald-400 (#34D399), emerald-50 (success states)
- Amber: amber-400 (#FBBF24), amber-50 (warning/break states)
- Rose: rose-400 (#FB7185) (danger/pomodoro)

NEUTRAL COLORS:
- Backgrounds: white/80, gray-50, gray-100
- Borders: gray-200/50, gray-700/50 (dark mode)
- Text: gray-900, gray-700, gray-500

GRADIENTS:
- Primary buttons: from-sky-500 to-blue-500
- Today's column: from-sky-50 via-cyan-50/80 to-blue-50/60
- Headers: from-gray-50 to-gray-100/50
```

### Bileşen Tasarım Kuralları
```
KARTLAR (Cards):
- Container: rounded-2xl bg-white/80 dark:bg-gray-800/80
- Effect: backdrop-blur-xl shadow-lg
- Border: border border-gray-200/50 dark:border-gray-700/50

BUTONLAR (Buttons):
- Primary: rounded-xl px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-500
- Secondary: rounded-xl border-2 p-4 transition-all duration-300
- Icon buttons: p-2 rounded-full hover:bg-gray-100

FORM ELEMENTS:
- Inputs: rounded-lg border-gray-300 focus:ring-sky-500
- Select: Modern dropdown stili
- Date/Time: Native HTML5 elemanları custom stilleri

BADGES:
- Status: rounded-full px-3 py-1 text-sm
- Colors: Pastel arka planlar (emerald-50, sky-50, amber-50)

NAVIGATION:
- Tab bar: rounded-xl bg-gray-100/80 backdrop-blur-sm p-1
- Active tab: bg-white shadow-md rounded-lg
- Animation: framer-motion layoutId for smooth transitions
```

### Animasyon ve Geçişler
```typescript
// Page entry
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}

// Tab transitions
<AnimatePresence mode="wait">
  <motion.div
    key={activeView}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
  />
</AnimatePresence>

// Card hover
transition-all duration-300
hover:shadow-lg
```

### Session Renk Paleti (Pastel)
```typescript
const SESSION_COLORS = [
  { name: 'Gök Mavisi', value: '#60A5FA', bg: 'bg-blue-400' },
  { name: 'Nane Yeşili', value: '#34D399', bg: 'bg-emerald-400' },
  { name: 'Lavanta', value: '#A78BFA', bg: 'bg-violet-400' },
  { name: 'Mercan', value: '#F87171', bg: 'bg-red-400' },
  { name: 'Kayısı', value: '#FBBF24', bg: 'bg-amber-400' },
  { name: 'Şakayık', value: '#F472B6', bg: 'bg-pink-400' },
  { name: 'Safir', value: '#818CF8', bg: 'bg-indigo-400' },
  { name: 'Deniz', value: '#2DD4BF', bg: 'bg-teal-400' },
  { name: 'Beton', value: '#9CA3AF', bg: 'bg-gray-400' },
  { name: 'Ayçiçeği', value: '#FCD34D', bg: 'bg-yellow-400' },
  { name: 'Okyanus', value: '#38BDF8', bg: 'bg-sky-400' },
  { name: 'Çimen', value: '#4ADE80', bg: 'bg-green-400' },
];
```

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
- ✅ **iOS Tarzı Modern UI/UX** (NEW)

**Son UI/UX İyileştirmeleri (2025-12-25)**:
- Planner sayfası iOS tarzı yeniden tasarlandı
- Pastel renk paleti uygulandı
- Glassmorphism efektleri eklendi
- Legend bölümü kaldırıldı
- CreateSessionModal modernize edildi
- Bugünün Planları bölümü yenilendi

### Aktif Geliştirme Alanları
1. **UI/UX Tutarlılığı**: Tüm sayfalarda iOS tarzı tasarım uygulanması
2. **Sistem Stabilizasyonu**: Mevcut özelliklerin stabilizasyonu
3. **Performans Optimizasyonu**: Hız ve verimlilik artışı

## Önemli Kararlar ve Yaklaşımlar

### Technical Decisions
- **State Management**: Zustand (simple) + TanStack Query (server state)
- **Form Management**: React Hook Form + Zod validation
- **Styling**: TailwindCSS + Headless UI (accessibility)
- **Database**: SQLite (development simplicity)
- **Authentication**: JWT with refresh token pattern
- **Backup**: node-cron + fs-extra for scheduled file-based backups
- **Design System**: iOS-inspired glassmorphism + soft/pastel colors

### Development Patterns
- **Component Structure**: Functional components only, hooks-based
- **Error Handling**: Global error boundaries + local error states
- **API Design**: RESTful with consistent response format
- **Validation**: Client-side + server-side validation
- **Styling Pattern**: Utility-first TailwindCSS with consistent design tokens

## Bilinmesi Gereken Patterns

### iOS Tarzı Kart Pattern
```tsx
<div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
  <div className="p-4">
    {/* Content */}
  </div>
</div>
```

### Gradient Buton Pattern
```tsx
<button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
  <Icon className="w-4 h-4" />
  Button Text
</button>
```

### Animated Tab Navigation Pattern
```tsx
<div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
  <button className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
    isActive ? 'text-sky-700 dark:text-sky-300' : 'text-gray-600 dark:text-gray-400'
  }`}>
    {isActive && (
      <motion.div
        layoutId="activeTab"
        className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-md"
        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
      />
    )}
    <span className="relative z-10">{label}</span>
  </button>
</div>
```

### Modal Pattern (Updated)
```tsx
<Dialog.Panel
  className="mx-auto max-w-lg w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50"
>
  <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
    {/* Header */}
  </div>
  <form className="p-5 space-y-5 overflow-y-auto flex-1">
    {/* Form content */}
  </form>
</Dialog.Panel>
```

## Önemli Dosya Lokasyonları

### Key Components
- **WeeklyPlanner**: `frontend/src/components/planner/WeeklyPlanner.tsx`
- **DailyCalendar**: `frontend/src/components/planner/DailyCalendar.tsx`
- **PlannerNavigation**: `frontend/src/components/planner/PlannerNavigation.tsx`
- **GoalsOverview**: `frontend/src/components/planner/GoalsOverview.tsx`
- **CreateSessionModal**: `frontend/src/components/planner/CreateSessionModal.tsx`
- **PlannerPage**: `frontend/src/pages/planner/PlannerPage.tsx`
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

### Design Insights (NEW)
1. **Glassmorphism**: `backdrop-blur-xl` + transparant backgrounds = modern iOS look
2. **Soft Colors**: 400 serisi Tailwind renkleri 500'e göre daha pastel/yumuşak
3. **Rounded Corners**: `rounded-2xl` kartlar için, `rounded-xl` butonlar için
4. **Subtle Borders**: Yarı saydam border'lar (`border-gray-200/50`) derinlik katıyor
5. **Gradient Buttons**: Primary aksiyon butonları için gradient daha çekici

### Technical Insights
1. **React Hook Form + Zod**: Güçlü validation ama empty string handling'e dikkat
2. **TanStack Query**: Automatic caching ama cache invalidation stratejisi önemli
3. **SQLite**: Development için harika ama `sync({ alter: true })` _backup tabloları bırakabilir
4. **node-cron**: Zamanlanmış görevler için basit ve etkili
5. **Framer Motion**: `layoutId` ile tab geçişlerinde smooth animasyon

### User Experience Insights
1. **Modal Design**: Flex layout + max-height + overflow-y-scroll kombinasyonu ideal
2. **Color Selection**: Preset renkler custom color picker'dan daha kullanıcı dostu
3. **Form Validation**: Anlık feedback + Türkçe hata mesajları önemli
4. **Theme Persistence**: Hem localStorage hem backend senkronizasyonu gerekli
5. **Visual Hierarchy**: Icon + text kombinasyonları daha okunabilir

## Development Workflow Update (2025-12-25)
- Root `npm run dev:all` starts backend + frontend together (`npm run dev` is an alias).
- Frontend proxy and env now point to backend port 5002.
- Backup routes added at `/api/backup/*` (admin only).
- Settings model extended with 'backup' category.
- **NEW**: iOS-style design system implemented for Planner page.
