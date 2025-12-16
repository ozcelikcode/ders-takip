# 📚 Ders Takip Sistemi

<div align="center">

![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

Öğrenci, öğretmen, çalışan ve yazılımcılar için modern, kullanıcı dostu görev takip ve zaman yönetimi sistemi.

[Özellikler](#-özellikler) • [Kurulum](#-kurulum) • [Kullanım](#-kullanım) • [Teknolojiler](#-teknoloji-stack)

</div>

---

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Ekran Görüntüleri](#-ekran-görüntüleri)
- [Teknoloji Stack](#-teknoloji-stack)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Proje Yapısı](#-proje-yapısı)
- [Katkıda Bulunma](#-katkıda-bulunma)
- [Lisans](#-lisans)

## ✨ Özellikler

### 🎯 Ana Özellikler

- **📅 Haftalık Planlayıcı**
  - Drag & drop ile görev taşıma
  - 15 dakikalık hassas zaman aralıkları
  - Geçmiş ve gelecek haftalara görev taşıma
  - Bağlam menüsü ile hızlı işlemler
  - Gerçek zamanlı görsel önizleme

- **⏱️ Pomodoro Timer**
  - Özelleştirilebilir çalışma süreleri
  - Otomatik mola yönetimi
  - Çalışma istatistikleri
  - Minimize edilebilir timer

- **📊 İstatistikler & Analiz**
  - Günlük, haftalık, aylık çalışma grafikleri
  - Ders bazında ilerleme takibi
  - Hedef başarı oranları
  - Recharts ile interaktif grafikler

- **📚 Görev & Proje Yönetimi**
  - Özelleştirilebilir kategoriler
  - Renk kodlu görev grupları
  - Görev oluşturma ve düzenleme
  - Konu bazında organizasyon

- **👤 Profil Yönetimi**
  - Profil fotoğrafı yükleme
  - Kullanıcı bilgileri düzenleme
  - Gerçek zamanlı bildirimler
  - Karanlık/Aydınlık tema

- **📱 Modern UI/UX**
  - Responsive tasarım (mobil uyumlu)
  - Dark mode desteği
  - Smooth animasyonlar (Framer Motion)
  - Lucide icons

## 🖼️ Ekran Görüntüleri

> _Ekran görüntüleri buraya eklenecek_

## 🚀 Teknoloji Stack

### Backend

| Teknoloji | Açıklama |
|-----------|----------|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web framework |
| **TypeScript** | Type-safe JavaScript |
| **SQLite** | Veritabanı (Sequelize ORM) |
| **JWT** | Authentication |
| **bcrypt** | Password hashing |
| **Helmet** | Güvenlik middleware |
| **Express Rate Limit** | Rate limiting |
| **Morgan** | HTTP request logger |
| **CORS** | Cross-origin resource sharing |

### Frontend

| Teknoloji | Açıklama |
|-----------|----------|
| **React 18** | UI library |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Build tool & dev server |
| **Zustand** | State management |
| **React Query (TanStack Query)** | Server state management |
| **React Router v6** | Routing |
| **Axios** | HTTP client |
| **TailwindCSS** | Utility-first CSS |
| **Framer Motion** | Animasyon kütüphanesi |
| **Recharts** | Grafik ve istatistik |
| **Lucide React** | Icon set |
| **React Hot Toast** | Bildirimler |
| **date-fns** | Tarih işlemleri |

## 📋 Kurulum

### Gereksinimler

- Node.js >= 18.0.0
- npm >= 9.0.0

### Adım Adım Kurulum

1. **Repository'yi klonlayın**
   ```bash
   git clone https://github.com/yourusername/ders-takip.git
   cd ders-takip
   ```

2. **Backend kurulumu**
   ```bash
   cd backend
   npm install
   ```

3. **Backend environment variables**

   `backend/.env` dosyası oluşturun:
   ```env
   PORT=5002
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
   JWT_EXPIRE=1d
   JWT_REFRESH_EXPIRE=7d
   BCRYPT_SALT_ROUNDS=12
   FRONTEND_URL=http://localhost:3000

   # Rate Limiting (Development'ta devre dışı)
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=10000
   ```

4. **Frontend kurulumu**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Frontend environment variables**

   `frontend/.env` dosyası oluşturun:
   ```env
   VITE_API_BASE_URL=http://localhost:5002/api
   ```

   Not: Root dizinde `npm run dev:all` komutu backend ve frontend'i beraber calistirir.

6. **Veritabanını başlatın**
   ```bash
   cd ../backend
   npm run dev
   ```

   İlk çalıştırmada SQLite veritabanı otomatik oluşturulacak ve örnek veriler yüklenecektir.

7. **Frontend'i başlatın**

   Yeni bir terminal açın:
   ```bash
   cd frontend
   npm run dev
   ```

8. **Tarayıcıda açın**

   http://localhost:3000

### 🔑 Varsayılan Kullanıcı Bilgileri

#### Admin
- **Email:** admin@localhost.com
- **Şifre:** 12345678

#### Öğrenci
- **Email:** student@localhost.com
- **Şifre:** 12345678

## 🎯 Kullanım

### Kullanıcı İş Akışı

1. **Giriş Yapın**
   - Kayıt ol veya mevcut hesapla giriş yap
   - Profil türünü seç (öğrenci, öğretmen, çalışan, yazılımcı, vb.)

2. **Dashboard'ı İnceleyin**
   - Bugünün görevleri ve hedefleri
   - Haftalık ilerleme grafikleri
   - Üretkenlik istatistikleri

3. **Haftalık Planlar Oluşturun**
   - Planlayıcı'ya gidin
   - Görev ekle butonuna tıklayın
   - Kategori, tarih ve süre seçin
   - Drag & drop ile görevleri taşıyın

4. **Çalışma/Görev Oturumu Başlatın**
   - Görev üzerine tıklayın
   - "Başlat" butonuna tıklayın
   - Pomodoro timer ile odaklan

5. **İlerlemeyi Takip Edin**
   - İstatistikler sayfasında detaylı analiz
   - Kategori bazında performans grafikleri

### Yönetici İş Akışı

1. **Kullanıcı Yönetimi**
   - Kullanıcılar sayfasından tüm kullanıcıları görüntüle
   - Yeni kullanıcı ekle
   - Kullanıcı bilgilerini düzenle

2. **Kategori ve Görev Yönetimi**
   - Kategoriler sayfasından kategori ekle/düzenle
   - Özelleştirilebilir kategori sistemleri
   - Renk ve ikon atamaları

## 📡 API Dokümantasyonu

### Base URL
```
http://localhost:5002/api
```

### Authentication Endpoints

```http
POST   /auth/register       # Yeni kullanıcı kaydı
POST   /auth/login          # Giriş yap
POST   /auth/logout         # Çıkış yap
POST   /auth/refresh        # Token yenile
GET    /auth/me             # Kullanıcı bilgisi
PUT    /auth/profile        # Profil güncelle
POST   /auth/upload-avatar  # Avatar yükle
```

### Study Sessions

```http
GET    /study-sessions                    # Oturumları listele
GET    /study-sessions/:id                # Oturum detayı
POST   /study-sessions                    # Yeni oturum oluştur
PUT    /study-sessions/:id                # Oturum güncelle
DELETE /study-sessions/:id                # Oturum sil
PUT    /study-sessions/:id/complete       # Oturumu tamamla
```

### Courses

```http
GET    /courses             # Ders listesi
GET    /courses/:id         # Ders detayı
POST   /courses             # Yeni ders (Admin)
PUT    /courses/:id         # Ders güncelle (Admin)
DELETE /courses/:id         # Ders sil (Admin)
```

### Plans

```http
GET    /plans               # Plan listesi
GET    /plans/:id           # Plan detayı
POST   /plans               # Yeni plan
PUT    /plans/:id           # Plan güncelle
DELETE /plans/:id           # Plan sil
```

### Örnek Request

```javascript
// Login
const response = await axios.post('/api/auth/login', {
  email: 'student@localhost.com',
  password: '12345678'
});

// Çalışma oturumu oluştur
const session = await axios.post('/api/study-sessions', {
  courseId: 1,
  title: 'Matematik Çalışması',
  startTime: '2025-10-07T09:00:00Z',
  endTime: '2025-10-07T10:30:00Z',
  duration: 90,
  type: 'study'
}, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 📁 Proje Yapısı

```
ders-takip/
├── backend/
│   ├── src/
│   │   ├── config/          # Veritabanı ve konfigürasyon
│   │   ├── controllers/     # Route controller'ları
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Sequelize modelleri
│   │   ├── routes/          # API route tanımları
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript tipleri
│   │   ├── utils/           # Yardımcı fonksiyonlar
│   │   └── index.ts         # Express uygulama giriş noktası
│   ├── uploads/             # Kullanıcı yüklemeleri
│   ├── database.sqlite      # SQLite veritabanı
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React bileşenleri
│   │   │   ├── common/      # Ortak bileşenler
│   │   │   ├── dashboard/   # Dashboard bileşenleri
│   │   │   ├── planner/     # Planlayıcı bileşenleri
│   │   │   └── ...
│   │   ├── pages/           # Sayfa bileşenleri
│   │   ├── services/        # API servisleri
│   │   ├── store/           # Zustand store'lar
│   │   ├── types/           # TypeScript tipleri
│   │   ├── utils/           # Yardımcı fonksiyonlar
│   │   ├── App.tsx          # Ana uygulama bileşeni
│   │   └── main.tsx         # React giriş noktası
│   ├── public/              # Statik dosyalar
│   ├── index.html           # HTML şablonu
│   └── package.json
│
├── README.md                # Bu dosya
└── package.json             # Root package.json
```

## 🔐 Güvenlik

- **JWT Authentication**: Access ve refresh token sistemi
- **Password Hashing**: bcrypt ile güvenli şifre hash'leme
- **CORS Protection**: Cross-origin güvenliği
- **Rate Limiting**: Brute force saldırı koruması (production'da aktif)
- **Helmet**: HTTP header güvenliği
- **Input Validation**: Tüm girişler doğrulanır
- **SQL Injection**: Sequelize ORM ile korunmalı

## 🐛 Sorun Giderme

### Port Çakışması

```bash
# Windows
netstat -ano | findstr :5002
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5002 | xargs kill -9
```

### Database Sıfırlama

```bash
cd backend
rm database.sqlite
npm run dev  # Otomatik yeniden oluşturulur
```

### Environment Variables

`.env` dosyalarının doğru konumda olduğundan emin olun:
- `backend/.env`
- `frontend/.env`

## 🚀 Deployment

### Production Build

```bash
# Frontend build
cd frontend
npm run build

# Backend
cd backend
npm run build  # TypeScript compile (opsiyonel)

# Production modda çalıştır
NODE_ENV=production npm start
```

### Environment Güvenliği

Production ortamında:
- Güçlü JWT secret'lar kullanın
- `NODE_ENV=production` ayarlayın
- Rate limiting'i aktif tutun
- HTTPS kullanın
- Environment variable'ları güvenli saklayın

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

### Commit Mesaj Formatı

```
feat: Yeni özellik
fix: Hata düzeltmesi
docs: Dokümantasyon değişikliği
style: Kod formatı
refactor: Kod yeniden yapılandırma
test: Test ekleme/düzenleme
chore: Yapılandırma değişiklikleri
```

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 👥 İletişim

Proje Linki: [https://github.com/ozcelikcode/ders-takip](https://github.com/ozcelikcode/ders-takip)

## 🙏 Teşekkürler
- [Claude](https://claude.ai/)
- [React](https://reactjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [TanStack Query](https://tanstack.com/query)
- [Framer Motion](https://www.framer.com/motion/)
- [Recharts](https://recharts.org/)
- Tüm açık kaynak katkıcılarına

---

<div align="center">

**⚡ Hızlı Başlangıç**: Backend ve frontend'i paralel terminallerde başlatın!

Made with ❤️ ozcelikcode & Claude Sonnet 4.5

</div>
