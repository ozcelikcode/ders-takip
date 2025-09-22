# Ders Takip ve Planlama Sistemi - Geliştirme Prompt'u

## Teknik Altyapı

### Backend
- **Framework**: Node.js + Express.js (hızlı ve performanslı)
- **API**: RESTful API mimarisi
- **Veritabanı**: MongoDB Atlas (cloud-native, otomatik scaling) - Otomatik setup ve konfigürasyon
- **ORM/ODM**: Mongoose (schema validation ile)
- **Veritabanı Setup**: Tam otomatik kurulum, örnek verilerle birlikte hazır database
- **Güvenlik**: Helmet, CORS, rate limiting
- **Environment**: .env dosyası ile konfigürasyon yönetimi

### Frontend
- **Framework**: React 18+ (fonksiyonel bileşenler only)
- **State Management**: Zustand (Redux'a modern alternatif)
- **HTTP Client**: Axios + React Query (caching ve error handling)
- **Routing**: React Router v6
- **Form Management**: React Hook Form + Zod validation
- **TypeScript**: Tip güvenliği için zorunlu

### Stil ve UI
- **CSS Framework**: TailwindCSS v3+
- **UI Components**: Headless UI + custom components
- **Icons**: Heroicons veya Lucide React
- **Animasyonlar**: Framer Motion (smooth transitions)
- **Charts**: Recharts (istatistikler için)
- **Responsive**: Mobile-first approach

## Güvenlik ve Performans

### Güvenlik
- JWT token (access + refresh token pattern)
- bcrypt ile şifre hashleme (salt rounds: 12)
- Input sanitization ve XSS koruması
- SQL injection koruması (NoSQL injection için)
- HTTPS zorunlu (production)
- API rate limiting (15 dakikada 100 istek/user)

### Performans
- Database indexing (user queries için)
- Image optimization (WebP format)
- Code splitting (React.lazy)
- Bundle size optimization
- Caching strategies (Redis entegrasyonu önerisi)

## Kullanıcı Rolleri ve Yetkiler

### Öğrenci Rolü
- Kendi ders takibi ve planlaması
- Takvim ile günü gününe dersleri görme, düzeltme.
- İstatistik görüntüleme
- Profil yönetimi
- Bildirim ayarları

### Yönetici Rolü
- Tüm öğrenci yönetimi
- Ders içeriği ve kategori yönetimi
- Sistem geneli istatistikler
- Log görüntüleme ve analiz
- Toplu işlemler (bulk operations)

## Özellik Gereksinimleri

### Öğrenci Paneli
- **Dashboard**: Günlük/haftalık ilerleme özeti
- **Ders Takibi**: 
  - TYT-AYT kategorileri (2025-2026 müfredatına göre)
  - Konu bazında ilerleme takibi
  - Not alma sistemi (rich text editor)
  - Başarı yüzdesi hesaplama
- **Planlama**: 
  - Drag & drop haftalık planlayıcı
  - Pomodoro timer entegrasyonu
  - Hedef belirleme sistemi
- **İstatistikler**:
  - Günlük/haftalık/aylık çalışma grafikleri
  - Ders bazında performans analizi
  - Hedef vs gerçekleşen karşılaştırması
- **Bildirimler**: 
  - Web push notifications
  - Email reminders (optional)
  - Çalışma hatırlatıcıları

### Yönetici Paneli
- **Kullanıcı Yönetimi**: CRUD operations + bulk actions
- **Ders Yönetimi**: 
  - Kategori ve konu ekleme/düzenleme
  - Müfredat güncellemeleri
  - İçerik sıralama sistemi
- **Analitik Dashboard**:
  - Kullanıcı aktivite raporları
  - Sistem kullanım metrikleri
  - Performans istatistikleri
- **Sistem Yönetimi**:
  - Audit log görüntüleme
  - Sistem health monitoring
  - Backup ve restore işlemleri

## Müfredat Entegrasyonu

### Öncelik Sırası
1. **2025-2026 Müfredatı** (birinci tercih)
2. **2024-2025 Müfredatı** (yedek)
3. **2023-2024 Müfredatı** (son çare)

### Ders Kategorileri
- **TYT Dersleri**: Türkçe, Matematik, Fen, Sosyal
- **AYT Dersleri**: Matematik, Fizik, Kimya, Biyoloji, Edebiyat, Tarih, Coğrafya, Felsefe
- Her ders için detaylı konu ağacı
- Zorluk seviyesi etiketleme

## Veritabanı Tasarımı

### Veritabanı Kurulum Gereksinimleri

**Otomatik Kurulum**:
- MongoDB Atlas hesabı oluşturma ve cluster setup'ı otomatik yapılsın
- Connection string'i otomatik .env dosyasına eklenmeli
- Database ve collection'ları otomatik oluşturulsun
- Index'ler otomatik kurulsun (user queries, course searches için)
- Seed data otomatik yüklensin (örnek dersler, konular, admin user)

**Konfigürasyon**:
- Free tier cluster (M0) kullanılsın
- Region: Europe (Frankfurt) - Türkiye'ye en yakın
- Database adı: "ders_takip_sistemi"
- Backup otomatik ayarlansın
- Security: IP whitelist (0.0.0.0/0 development için)
- Database user: otomatik oluşturulsun, credentials .env'e kayıt edilsin
- **users**: Kullanıcı bilgileri ve rolleri
- **courses**: Ders kategorileri ve içerikleri
- **topics**: Konu detayları ve müfredat bilgisi
- **progress**: Öğrenci ilerleme kayıtları
- **plans**: Haftalık çalışma planları
- **notifications**: Bildirim geçmişi
- **logs**: Sistem aktivite kayıtları

## UI/UX Gereksinimleri

### Tasarım Prensipleri
- **Minimal ve Clean**: Gereksiz elementlerden kaçınılmalı
- **Accessibility**: WCAG 2.1 standartlarına uygun
- **Dark/Light Mode**: Tema değiştirme özelliği
- **Responsive**: Tüm cihazlarda mükemmel görünüm
- **Loading States**: Her işlem için uygun loading indicator

### Renk Şeması
- Primary: Modern mavi tonları
- Secondary: Nötr gri tonları
- Success/Error: Yeşil/kırmızı accent colors
- Background: Beyaz/koyu gri (tema based)

## Teknik Detaylar

### Error Handling
- Global error boundary (React)
- API error interceptors
- User-friendly error messages (Türkçe)
- Error logging ve monitoring

### Validation
- Frontend: Zod schema validation
- Backend: Joi validation
- Real-time validation feedback
- Custom validation rules

### Testing (Önerilen)
- Unit tests: Jest + React Testing Library
- Integration tests: API endpoint testing
- E2E tests: Cypress (optional)

## Kurulum ve Deployment

### Development Setup (Tam Otomatik)
```bash
# Tek komutla tüm sistem kurulumu
npm run setup

# Alternatif manuel kurulum
npm install
npm run db:setup  # MongoDB Atlas otomatik kurulum
npm run seed      # Örnek veri yükleme
npm run dev       # Development server başlatma
```

**Setup Script Gereksinimleri**:
- MongoDB Atlas hesabı otomatik oluşturma
- Database cluster ve user setup
- Connection string .env'e kayıt
- Seed data yükleme
- Tüm dependencies kurulumu

### Environment Variables (Otomatik Oluşturulacak)
```
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ders_takip_sistemi
JWT_SECRET=otomatik_generate_edilecek_secret
JWT_REFRESH_SECRET=otomatik_generate_edilecek_refresh_secret
EMAIL_SERVICE_API_KEY=optional_email_service_key
```

**Not**: Tüm secrets ve connection string'ler otomatik generate edilip .env dosyasına yazılacak

### Default Admin User
- **Username**: admin
- **Password**: 12345678
- **Role**: administrator
- **Email**: admin@localhost.com

## Dokümantasyon Gereksinimleri

### README.md İçeriği
1. **Proje Açıklaması**: Özellikler ve kullanım senaryoları
2. **Kurulum Talimatları**: Adım adım setup guide
3. **API Dokümantasyonu**: Tüm endpoint'ler ve örnekler
4. **Kullanıcı Rehberi**: Screenshots ile kullanım kılavuzu
5. **Teknoloji Stack**: Kullanılan tüm kütüphaneler
6. **Deployment Guide**: Production kurulum talimatları
7. **Troubleshooting**: Yaygın sorunlar ve çözümleri

### Code Documentation
- JSDoc comments (English)
- TypeScript interfaces ve types
- Component prop documentation
- API response schemas

## Ekstra Özellikler *olması gerek (Nice to Have)

- **PWA Support**: Offline çalışma kabiliyeti
- **Export/Import**: Veri yedekleme özellikleri  
- **Multi-language**: İngilizce desteği
- **Social Features**: Öğrenci grupları ve rekabet
- **Mobile App**: React Native versiyonu
- **AI Integration**: Çalışma önerileri algoritması

## Kalite Kontrol

### Code Quality
- ESLint + Prettier konfigürasyonu
- Husky pre-commit hooks
- TypeScript strict mode
- Code review checklist

### Performance Metrics
- Lighthouse score: 90+ (tüm kategorilerde)
- Bundle size: <500KB (gzipped)
- API response time: <200ms
- Database query optimization

Bu prompt ile modern, ölçeklenebilir ve profesyonel bir ders takip sistemi geliştirilebilir.