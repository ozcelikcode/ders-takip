# Ders Takip Sistemi - Tech Context

## Teknoloji Stack

### Backend Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (Sequelize ORM)
- **Authentication**: JWT (Access + Refresh Token)
- **Security**: Helmet, CORS, bcrypt, Express Rate Limit
- **Development**: nodemon, ts-node

### Frontend Stack
- **Framework**: React 18 (Hooks only, no class components)
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (client state) + TanStack Query (server state)
- **Routing**: React Router v6
- **Styling**: TailwindCSS
- **UI Components**: Headless UI
- **Forms**: React Hook Form + Zod validation
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns
- **HTTP Client**: Axios

## Frontend Bileşen Yapısı

### 📁 Common Components (frontend/src/components/common)
Temel ve paylaşılan bileşenler.

#### Header.tsx
- **Amaç**: Üst navigasyon barı
- **Özellikler**:
  - Kullanıcı profil menüsü
  - Bildirim ikonu
  - Logo ve başlık
  - Responsive hamburger menü (mobil)
- **Kullanılan Yerler**: Layout component içinde

#### Sidebar.tsx
- **Amaç**: Sol navigasyon menüsü
- **Özellikler**:
  - Dashboard, Planlayıcı, Dersler, İstatistikler linkler
  - Admin panel erişimi (admin kullanıcılar için)
  - Aktif sayfa göstergesi
  - Collapsible menü desteği
- **State**: Zustand UI store ile açık/kapalı durumu

#### Layout.tsx
- **Amaç**: Ana sayfa düzeni wrapper
- **Özellikler**:
  - Header + Sidebar + Content yapısı
  - Protected route wrapper
  - Responsive layout
  - Dark mode desteği

#### LoadingScreen.tsx
- **Amaç**: Tam sayfa yükleme ekranı
- **Özellikler**:
  - Animasyonlu spinner
  - Loading mesajları
  - Skeleton loader variants

#### ConfirmDialog.tsx
- **Amaç**: Onay diyalog modalı
- **Özellikler**:
  - Headless UI Dialog kullanımı
  - Customizable title, message, buttons
  - Framer Motion animasyonları
  - Tehlike/bilgi/uyarı varyantları

### 📁 Modal Components (frontend/src/components/modals)
Tüm modal/dialog bileşenleri.

#### CourseCreateModal.tsx
- **Amaç**: Yeni ders oluşturma modalı
- **Form Alanları**:
  - Ders adı (required)
  - Kategori seçimi (required)
  - Açıklama (optional)
  - Renk seçimi (10 preset renk)
  - Icon seçimi (Lucide icons)
- **Validation**: React Hook Form + Zod
- **API Call**: POST /api/courses
- **Cache Invalidation**: ['courses'] query

#### CreateTopicModal.tsx
- **Amaç**: Derse yeni konu ekleme
- **Form Alanları**:
  - Konu adı (required)
  - Açıklama (optional, boş string allowed)
  - Tahmini süre (dakika, required)
  - Zorluk seviyesi (Kolay/Orta/Zor)
- **Özellikler**:
  - Kategori rengini kullan butonu
  - Otomatik order hesaplama
  - Scroll optimization (overflow-y-scroll)
- **API Call**: POST /api/topics
- **Cache Invalidation**: ['course', courseId, { includeTopics: true }]
- **Critical Fix**: Query key structure includes parameters

#### EditTopicModal.tsx
- **Amaç**: Mevcut konuyu düzenleme
- **Özellikler**:
  - Pre-filled form values
  - Aynı validation rules
  - Update API call
- **API Call**: PUT /api/topics/:id
- **Cache Invalidation**: ['course'] query

#### AddTopicModal.tsx
- **Amaç**: Alternatif konu ekleme modalı (basit versiyon)
- **Fark**: Minimal form, hızlı ekleme

#### CategoryManagementModal.tsx
- **Amaç**: Kategori yönetimi (CRUD)
- **Özellikler**:
  - Kategori listesi
  - Oluştur/düzenle/sil işlemleri
  - Renk ve icon seçimi
  - Sıralama desteği
- **API Calls**:
  - GET /api/categories
  - POST /api/categories
  - PUT /api/categories/:id
  - DELETE /api/categories/:id
- **Cache Invalidation**: ['categories'], ['courses']

### 📁 Planner Components (frontend/src/components/planner)
Planlayıcı ve takvim bileşenleri.

#### WeeklyPlanner.tsx
- **Amaç**: Haftalık drag & drop planlayıcı
- **Özellikler**:
  - 7 günlük grid (Pazartesi-Pazar)
  - 15 dakikalık zaman slotları (00:00 - 24:00)
  - HTML5 Drag & Drop API
  - Session kartları (color-coded)
  - Çoklu gün desteği
  - Context menu (sağ click) işlemleri
  - Race condition handling
- **State Management**:
  - Local state (drag state)
  - TanStack Query (session data)
- **API Calls**:
  - GET /api/study-sessions
  - PUT /api/study-sessions/:id
  - DELETE /api/study-sessions/:id

#### DailyCalendar.tsx
- **Amaç**: Günlük detaylı takvim görünümü
- **Özellikler**:
  - Tek gün odaklı view
  - Saat bazında detay
  - Session detayları
  - Quick actions
- **Integration**: WeeklyPlanner ile entegre

#### CreateSessionModal.tsx
- **Amaç**: Yeni çalışma oturumu oluşturma
- **Form Alanları**:
  - Başlık (required)
  - Ders/konu seçimi (optional)
  - Başlangıç/bitiş zamanı
  - Durum (planned/in_progress/completed)
  - Notlar (optional)
  - Renk (optional)
- **Validation**: Zaman çakışma kontrolü
- **API Call**: POST /api/study-sessions

#### MoveSessionModal.tsx
- **Amaç**: Session'ı farklı güne/saate taşıma
- **Özellikler**:
  - Tarih seçici
  - Saat seçici
  - Çakışma uyarısı
- **API Call**: PUT /api/study-sessions/:id

#### GoalSettingModal.tsx
- **Amaç**: Haftalık/günlük hedef belirleme
- **Form Alanları**:
  - Hedef tipi (günlük/haftalık)
  - Çalışma süresi hedefi
  - Ders bazında hedefler
- **API Call**: POST /api/plans

#### GoalsOverview.tsx
- **Amaç**: Hedef özeti ve ilerleme
- **Özellikler**:
  - Progress bar'lar
  - Hedef karşılaştırması
  - Başarı oranları

#### PomodoroTimer.tsx
- **Amaç**: Pomodoro tekniği timer
- **Özellikler**:
  - Countdown timer
  - Work/Break modları
  - Session tracking
  - Notifications
  - Customizable durations
- **Local Storage**: Timer state persistence

#### PomodoroModal.tsx
- **Amaç**: Pomodoro ayarları modalı
- **Settings**:
  - Çalışma süresi (default: 25 min)
  - Kısa mola (default: 5 min)
  - Uzun mola (default: 15 min)
  - Oto-başlatma seçenekleri

#### PlannerNavigation.tsx
- **Amaç**: Planlayıcı navigasyon kontrolleri
- **Özellikler**:
  - Hafta ileri/geri butonları
  - Bugüne dön butonu
  - Tarih seçici
  - Görünüm değiştirme (haftalık/günlük)

### 📁 Dashboard Components (frontend/src/components/dashboard)
Dashboard özgü bileşenler.

#### WeeklyProgressChart.tsx
- **Amaç**: Haftalık çalışma ilerleme grafiği
- **Özellikler**:
  - Recharts bar chart
  - 7 günlük data
  - Günlük çalışma süreleri
  - Interaktif tooltip
  - Responsive tasarım

#### RecentActivities.tsx
- **Amaç**: Son aktiviteler listesi
- **Özellikler**:
  - Son 10 çalışma oturumu
  - Zaman gösterimi (relative time)
  - Durum indikasyonları
  - Quick navigation

### 📁 Admin Components (frontend/src/components/admin)
Admin panel özgü bileşenler.

#### CourseManagementModal.tsx
- **Amaç**: Toplu ders yönetimi (admin)
- **Özellikler**:
  - Bulk operations
  - Advanced filtering
  - Export functionality

#### CreateUserModal.tsx
- **Amaç**: Yeni kullanıcı oluşturma (admin)
- **Form Alanları**:
  - Email, şifre
  - İsim, soyisim
  - Rol seçimi (user/admin)
- **API Call**: POST /api/users (admin only)

#### AdminScheduleManager.tsx
- **Amaç**: Kullanıcı programlarını yönetme
- **Özellikler**:
  - Kullanıcı seçimi
  - Schedule görüntüleme
  - Bulk editing

### 📁 Auth Components (frontend/src/components/auth)
Authentication guard bileşenleri.

#### ProtectedRoute.tsx
- **Amaç**: Authenticated kullanıcı kontrolü
- **Davranış**:
  - Token kontrolü
  - Giriş yapmamışsa /login'e yönlendir
  - Children render et (authenticated ise)
- **Integration**: React Router wrapper

#### AdminRoute.tsx
- **Amaç**: Admin yetkisi kontrolü
- **Davranış**:
  - ProtectedRoute + admin role check
  - Admin değilse 403 veya dashboard'a yönlendir
  - Admin ise children render et

## Frontend Pages (frontend/src/pages)

### 📄 Auth Pages

#### LoginPage.tsx
- **Path**: `/login`
- **Özellikler**:
  - Email/şifre form
  - "Beni hatırla" checkbox
  - Kayıt sayfasına link
  - Form validation
  - Loading states
- **API Call**: POST /api/auth/login
- **Redirect**: Dashboard (başarılı giriş)

#### RegisterPage.tsx
- **Path**: `/register`
- **Özellikler**:
  - Email, şifre, isim, soyisim
  - Şifre güvenlik göstergesi
  - Terms & conditions checkbox
  - Form validation
- **API Call**: POST /api/auth/register
- **Redirect**: Dashboard (başarılı kayıt)

### 📄 Main Pages

#### DashboardPage.tsx (frontend/src/pages/dashboard)
- **Path**: `/dashboard` (default home)
- **Bölümler**:
  - Günlük özet (bugünkü çalışma, hedefler)
  - Haftalık ilerleme chart
  - Yaklaşan oturumlar
  - Son aktiviteler
  - Quick actions (yeni oturum, planlayıcıya git)
- **API Calls**:
  - GET /api/study-sessions?startDate&endDate
  - GET /api/courses
  - GET /api/settings
- **Components**: WeeklyProgressChart, RecentActivities

#### PlannerPage.tsx (frontend/src/pages/planner)
- **Path**: `/planner`
- **Özellikler**:
  - WeeklyPlanner component
  - PlannerNavigation
  - CreateSessionModal trigger
  - GoalsOverview sidebar
- **Real-time Updates**: TanStack Query auto-refetch

#### CoursesPage.tsx (frontend/src/pages/courses)
- **Path**: `/courses`
- **Özellikler**:
  - Kategori bazlı ders listesi
  - Grid/List görünümü toggle
  - Ders kartları (renk, icon, konu sayısı)
  - Search/filter
  - Quick actions (düzenle, sil, detay)
- **API Calls**:
  - GET /api/courses?includeTopics=true
  - GET /api/categories

#### CourseDetailPage.tsx
- **Path**: `/courses/:id`
- **Özellikler**:
  - Ders bilgileri
  - Konu listesi (order ile sıralı)
  - Drag & drop konu sıralama
  - Konu ekleme/düzenleme/silme
  - İstatistikler (tamamlanma oranı)
- **API Calls**:
  - GET /api/courses/:id?includeTopics=true
  - PUT /api/topics/course/:id/reorder
- **Query Key**: ['course', id, { includeTopics: true }]
- **Critical**: Cache key includes parameters for proper invalidation

#### PomodoroPage.tsx (frontend/src/pages/pomodoro)
- **Path**: `/pomodoro`
- **Özellikler**:
  - Büyük timer display
  - Start/Pause/Reset kontrolları
  - Session counter
  - Settings modal
  - Mini timer modu
- **Local Storage**: Timer state persistence

#### ProfilePage.tsx (frontend/src/pages/profile)
- **Path**: `/profile`
- **Özellikler**:
  - Profil fotoğrafı yükleme
  - İsim, email düzenleme
  - Şifre değiştirme
  - Hesap ayarları
- **API Calls**:
  - GET /api/auth/me
  - PUT /api/auth/profile
  - POST /api/auth/upload-avatar

#### UserSettingsPage.tsx (frontend/src/pages/settings)
- **Path**: `/settings`
- **Özellikler**:
  - Tema seçimi (light/dark)
  - Bildirim ayarları
  - Çalışma süresi tercihleri
  - Dil seçimi (gelecek özellik)
- **API Calls**:
  - GET /api/settings
  - PUT /api/settings

### 📄 Admin Pages (frontend/src/pages/admin)

#### AdminDashboardPage.tsx
- **Path**: `/admin`
- **Özellikler**:
  - Toplam kullanıcı/ders/oturum sayıları
  - Sistem istatistikleri
  - Son kullanıcı aktiviteleri
  - Quick admin actions

#### AdminUsersPage.tsx
- **Path**: `/admin/users`
- **Özellikler**:
  - Kullanıcı listesi (tablo)
  - Arama ve filtreleme
  - Kullanıcı oluştur/düzenle/sil
  - Rol değiştirme
  - Bulk operations
- **API Call**: GET /api/users (admin only)

#### AdminCoursesPage.tsx
- **Path**: `/admin/courses`
- **Özellikler**:
  - Tüm kullanıcıların dersleri
  - Toplu ders yönetimi
  - İstatistikler
- **API Call**: GET /api/admin/courses

#### AdminCategoriesPage.tsx
- **Path**: `/admin/categories`
- **Özellikler**:
  - Global kategori yönetimi
  - Kategori oluştur/düzenle/sil

#### AdminSettingsPage.tsx
- **Path**: `/admin/settings`
- **Özellikler**:
  - Sistem ayarları
  - Bakım modu
  - Log görüntüleme

## Backend Yapısı

### 📁 Controllers (backend/src/controllers)
Business logic ve API endpoint handlers.

#### authController.ts
- **Endpoints**:
  - POST /auth/register - Kullanıcı kaydı
  - POST /auth/login - Giriş
  - POST /auth/logout - Çıkış
  - POST /auth/refresh - Token yenileme
  - GET /auth/me - Kullanıcı bilgileri
  - PUT /auth/profile - Profil güncelleme
  - POST /auth/upload-avatar - Avatar yükleme
- **Güvenlik**: bcrypt password hashing, JWT token generation

#### userController.ts
- **Endpoints**:
  - GET /users - Tüm kullanıcılar (admin only)
  - GET /users/:id - Kullanıcı detayı (admin only)
  - POST /users - Kullanıcı oluştur (admin only)
  - PUT /users/:id - Kullanıcı güncelle (admin only)
  - DELETE /users/:id - Kullanıcı sil (admin only)
- **Features**: Role-based access control

#### categoryController.ts
- **Endpoints**:
  - GET /categories - Tüm kategoriler
  - GET /categories/:id - Kategori detayı
  - POST /categories - Kategori oluştur
  - PUT /categories/:id - Kategori güncelle
  - DELETE /categories/:id - Kategori sil
- **Relations**: Category -> Courses (one-to-many)

#### courseController.ts
- **Endpoints**:
  - GET /courses - Ders listesi
  - GET /courses/:id - Ders detayı
  - POST /courses - Ders oluştur
  - PUT /courses/:id - Ders güncelle
  - DELETE /courses/:id - Ders sil
- **Query Parameters**:
  - includeTopics=true (konuları dahil et)
  - categoryId (kategoriye göre filtre)
- **Relations**: Course -> Topics, Course -> Category
- **Debug Logging**: Course data structure logging enabled

#### topicController.ts
- **Endpoints**:
  - GET /topics - Konu listesi
  - GET /topics/:id - Konu detayı
  - POST /topics - Konu oluştur
  - PUT /topics/:id - Konu güncelle
  - DELETE /topics/:id - Konu sil
  - PUT /topics/course/:courseId/reorder - Konu sıralaması
- **Features**:
  - Otomatik order hesaplama (konu oluştururken)
  - Bulk reordering support
- **Validation**: Order field validasyonu kaldırıldı (auto-calculate)

#### studySessionController.ts
- **Endpoints**:
  - GET /study-sessions - Oturum listesi
  - GET /study-sessions/:id - Oturum detayı
  - POST /study-sessions - Oturum oluştur
  - PUT /study-sessions/:id - Oturum güncelle
  - DELETE /study-sessions/:id - Oturum sil
  - PUT /study-sessions/:id/complete - Oturumu tamamla
- **Query Parameters**:
  - startDate, endDate (tarih aralığı)
  - status (planned/in_progress/completed)
  - courseId (derse göre filtre)
- **Features**: Çakışma kontrolü, süre hesaplama

#### planController.ts
- **Endpoints**:
  - GET /plans - Plan listesi
  - GET /plans/:id - Plan detayı
  - POST /plans - Plan oluştur
  - PUT /plans/:id - Plan güncelle
  - DELETE /plans/:id - Plan sil
- **Features**: Haftalık plan yönetimi, hedef tracking

#### settingsController.ts
- **Endpoints**:
  - GET /settings - Kullanıcı ayarları
  - PUT /settings - Ayarları güncelle
- **Settings**: Theme, notifications, work durations, etc.

### 📁 Models (backend/src/models)
Sequelize ORM modelleri.

#### User.ts
```typescript
interface User {
  id: number;
  email: string;
  password: string; // bcrypt hashed
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}
```
- **Relations**:
  - hasMany(Category)
  - hasMany(Course)
  - hasMany(StudySession)
  - hasMany(Plan)

#### Category.ts
```typescript
interface Category {
  id: number;
  userId: number;
  name: string;
  description?: string;
  color: string; // hex color
  icon: string; // Lucide icon name
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
- **Relations**:
  - belongsTo(User)
  - hasMany(Course)

#### Course.ts
```typescript
interface Course {
  id: number;
  userId: number;
  categoryId: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
- **Relations**:
  - belongsTo(User)
  - belongsTo(Category)
  - hasMany(Topic)
  - hasMany(StudySession)
- **Optional Properties**: category (includes Category when fetched with include)

#### Topic.ts
```typescript
interface Topic {
  id: number;
  courseId: number;
  name: string;
  description?: string;
  estimatedTime: number; // minutes
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
- **Relations**:
  - belongsTo(Course)
  - hasMany(StudySession)

#### StudySession.ts
```typescript
interface StudySession {
  id: number;
  userId: number;
  planId?: number;
  topicId?: number;
  courseId?: number;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  status: 'planned' | 'in_progress' | 'completed';
  sessionType: 'study' | 'break' | 'exam';
  color?: string;
  notes?: string;
  productivity?: number; // 1-5 rating
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```
- **Relations**:
  - belongsTo(User)
  - belongsTo(Topic)
  - belongsTo(Course)
  - belongsTo(Plan)

#### Plan.ts
```typescript
interface Plan {
  id: number;
  userId: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  goals?: JSON; // flexible goal structure
  createdAt: Date;
  updatedAt: Date;
}
```
- **Relations**:
  - belongsTo(User)
  - hasMany(StudySession)

#### Settings.ts
```typescript
interface Settings {
  id: number;
  userId: number;
  theme: 'light' | 'dark';
  notifications: boolean;
  workDuration: number; // Pomodoro default (minutes)
  shortBreak: number;
  longBreak: number;
  autoStartBreak: boolean;
  autoStartWork: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
- **Relations**: belongsTo(User)

### 📁 Routes (backend/src/routes)
Express route definitions.

#### auth.ts
- **Base**: `/api/auth`
- **Middleware**: Çoğu endpoint için auth middleware gerekli
- **Public Endpoints**: register, login
- **Protected Endpoints**: logout, refresh, me, profile, upload-avatar

#### users.ts
- **Base**: `/api/users`
- **Middleware**: auth + admin role check (tüm endpoints)
- **Admin Only**: Tüm user management endpoints

#### categories.ts
- **Base**: `/api/categories`
- **Middleware**: auth middleware (tüm endpoints)
- **Authorization**: Kullanıcı sadece kendi kategorilerini görebilir/düzenleyebilir

#### courses.ts
- **Base**: `/api/courses`
- **Middleware**: auth middleware
- **Query Parameters**: includeTopics, categoryId
- **Authorization**: Kullanıcı sadece kendi derslerini yönetir

#### topics.ts
- **Base**: `/api/topics`
- **Middleware**: auth middleware
- **Special Route**: PUT /topics/course/:courseId/reorder (bulk reorder)

#### studySessionRoutes.ts
- **Base**: `/api/study-sessions`
- **Middleware**: auth middleware
- **Special Route**: PUT /study-sessions/:id/complete

#### planRoutes.ts
- **Base**: `/api/plans`
- **Middleware**: auth middleware

#### settingsRoutes.ts
- **Base**: `/api/settings`
- **Middleware**: auth middleware

### 📁 Middleware (backend/src/middleware)

#### auth.ts
- **protect**: JWT token doğrulama middleware
  - Authorization header kontrolü
  - Token validation
  - User attach to req.user
- **adminOnly**: Admin role kontrolü
  - protect middleware sonrası çalışır
  - req.user.role === 'admin' kontrolü

#### errorHandler.ts
- **globalErrorHandler**: Tüm hataları yakalayan middleware
  - Sequelize validation errors
  - JWT errors
  - Custom app errors
  - 500 Internal Server errors
- **Response format**:
```typescript
{
  success: false,
  error: {
    message: string,
    code: string
  }
}
```

#### notFound.ts
- **404 Handler**: Tanımlanmamış route'lar için
- Son middleware olarak register edilir

#### validate.ts
- **validateRequest**: Request validation middleware factory
- Zod schema validation
- Body/query/params validation

## Frontend Services (frontend/src/services)

### api.ts
- **Axios instance**: Merkezi HTTP client
- **Base URL**: `VITE_API_BASE_URL` env variable
- **Interceptors**:
  - Request: Authorization header ekleme
  - Response: 401 error handling, token refresh
- **Error Handling**: Centralized error formatting

### API Service Files (Eksik)
Şu anda sadece `api.ts` var. Gelecekte eklenebilir:
- coursesAPI.ts (course API calls)
- authAPI.ts (auth API calls)
- topicsAPI.ts (topic API calls)
- sessionsAPI.ts (session API calls)

## State Management

### Zustand Stores (Varsayılan)
Projenin state management için Zustand kullandığı belirtilmiş ama:
- **Gerçek Durum**: Store dosyaları frontend/src/store'da yok
- **Olası Durum**: Inline state management veya context API kullanılıyor
- **TanStack Query**: Server state için aktif kullanımda

### TanStack Query Patterns

#### Query Keys Convention
```typescript
// Tutarlı query key yapısı ZORUNLU
['resource', identifier, parameters]

// Örnekler:
['courses'] // Tüm dersler
['course', courseId, { includeTopics: true }] // Parametreli tek ders
['study-sessions', { startDate, endDate }] // Parametreli liste
```

#### Cache Invalidation Pattern
```typescript
// Query key ile invalidation TAM olarak eşleşmeli
queryClient.invalidateQueries({
  queryKey: ['course', courseId, { includeTopics: true }]
});
```

**Critical Issue (ÇÖZÜLDÜ)**:
- Önceki problem: Query key ve invalidation key mismatch
- Çözüm: Her iki yerde de aynı query key yapısı (parameters dahil)

## Development Setup

### Environment Requirements
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Development Commands
```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend in development
npm run dev

# Individual services
npm run dev:backend  # Backend on port 5002
npm run dev:frontend # Frontend on port 3000

# Build for production
npm run build

# Linting
npm run lint

# Database operations
npm run db:setup
npm run seed
```

### Environment Variables

#### Backend (.env)
```env
PORT=5002
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRE=1d
JWT_REFRESH_EXPIRE=7d
BCRYPT_SALT_ROUNDS=12
FRONTEND_URL=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10000
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5002/api
VITE_APP_NAME=Ders Takip Sistemi
VITE_NODE_ENV=development
```

**Important**: Backend port 5001'den 5002'ye taşındı (port conflict çözümü)

## API Architecture

### RESTful API Design
```
Base URL: http://localhost:5002/api

Authentication: Bearer Token (JWT)
Content-Type: application/json
```

### Response Format
```typescript
// Success Response
{
  "success": true,
  "data": {
    "course": { /* course data */ }
  },
  "message": "Ders başarıyla oluşturuldu"
}

// Error Response
{
  "success": false,
  "error": {
    "message": "Bu email zaten kullanılıyor",
    "code": "EMAIL_EXISTS"
  }
}

// List Response
{
  "success": true,
  "data": {
    "courses": [ /* array of courses */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

## Database Architecture

### Database Choice: SQLite
**Neden SQLite?**
- Zero configuration - development için ideal
- Single file - deployment basit
- TypeScript/Sequelize desteği güçlü
- Performansı bu proje için yeterli

### Database File
- **Location**: `backend/database.sqlite`
- **Development**: Auto-sync enabled
- **Production**: Migration system gerekli

### Sequelize Configuration
- **Dialect**: sqlite
- **Logging**: Console.log (development)
- **Auto-sync**: Enabled (development only)

## Authentication System

### JWT Flow
```
1. User Login → POST /auth/login
2. Server validates → Returns access_token + refresh_token
3. Client stores tokens → localStorage + httpOnly cookie
4. API Requests → Include Bearer access_token
5. Token Expires → Use refresh_token to get new access_token
6. Refresh Expires → Force logout
```

### Token Management
```typescript
// Access Token: 1 day expiry, stored in localStorage
// Refresh Token: 7 days expiry, stored in httpOnly cookie

// Auto-refresh mechanism
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAuthToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Performance Optimizations

### Frontend Optimizations
- **Code Splitting**: Lazy loading for routes
- **Bundle Size**: Tree shaking, dynamic imports
- **Caching**: TanStack Query automatic caching
- **Memoization**: useMemo, useCallback for expensive operations
- **Virtual Scrolling**: For long lists (plans, sessions)

### Backend Optimizations
- **Database Indexing**: On frequently queried fields
- **Query Optimization**: Sequelize includes, eager loading
- **Caching**: Response caching for static data
- **Pagination**: For large datasets

## Security Implementation

### Authentication Security
- bcrypt with 12 salt rounds for password hashing
- JWT with HS256 signing
- Refresh token rotation
- Secure httpOnly cookies for refresh tokens

### API Security
- Helmet.js for security headers
- CORS configuration
- Rate limiting (10000 req/min in development)
- Input validation on all endpoints
- SQL injection prevention via Sequelize

### Frontend Security
- XSS prevention via React's built-in protections
- CSRF protection via same-site cookies
- Content Security Policy headers
- HTTPS enforcement in production

## Development Tools

### Code Quality
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Pre-commit**: Husky + lint-staged
- **Git Hooks**: Automated formatting on commit

### Testing Strategy
- **Backend**: Jest + Supertest for API tests (planned)
- **Frontend**: React Testing Library for component tests (planned)
- **E2E**: Cypress (future enhancement)
- **Type Safety**: TypeScript for compile-time checking

### Development Experience
- **Hot Reload**: Vite HMR, nodemon
- **Developer Tools**: React DevTools
- **API Documentation**: Swagger/OpenAPI (planned)
- **Environment**: Consistent development setup

## Critical Fixes ve Öğrenmeler

### React Query Cache Key Mismatch (2025-11-14) ✅
**Problem**: Konu oluşturulduktan sonra sayfa yenilenene kadar görünmüyordu
**Root Cause**: Query key ve invalidation key mismatch
- CourseDetailPage: `['course', id, { includeTopics: true }]`
- CreateTopicModal: `['course', courseId]` (parametresiz)
**Çözüm**: Her iki yerde de `['course', id, { includeTopics: true }]` kullanımı

**Öğrenilen**: TanStack Query'de parametreli sorgularda query key'e parametreleri dahil etmek ZORUNLU!

### Backend Port Migration (2025-11-14) ✅
**Problem**: Port 5001 çakışması
**Çözüm**: Backend port 5002'ye taşındı, frontend .env güncellendi

### Form Validation Pattern (Önceki session) ✅
**Problem**: Zod `.optional()` empty string kabul etmiyordu
**Çözüm**: `.optional().or(z.literal(''))`

**Öğrenilen**: React Hook Form + Zod'da empty string handling özel dikkat gerektirir
