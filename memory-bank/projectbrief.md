# Ders Takip Sistemi - Project Brief

## Proje Adı
Ders Takip ve Planlama Sistemi (ders-takip)

## Proje Amacı
Öğrencilerin derslerini takip etmelerini, çalışma planları oluşturmalarını ve ilerleme istatistiklerini görmelerini sağlayan modern bir web uygulaması geliştirmek.

## Temel Gereksinimler

### Kullanıcı Rolleri
- **Öğrenci**: Kendi ders takibi, planlama, istatistik görme
- **Yönetici**: Kullanıcı yönetimi, içerik yönetimi

### Ana Özellikler
1. **Haftalık Planlayıcı**: Drag & drop görev taşıma, 15 dakikalık zaman aralıkları
2. **Pomodoro Timer**: Özelleştirilebilir çalışma süreleri, otomatik mola yönetimi
3. **İstatistikler & Analiz**: Günlük, haftalık, aylık çalışma grafikleri
4. **Görev & Proje Yönetimi**: Kategoriler, renk kodlama, konu bazlı organizasyon
5. **Profil Yönetimi**: Kullanıcı bilgileri, bildirimler, tema değiştirme
6. **Modern UI/UX**: Responsive tasarım, dark mode, smooth animasyonlar

### Teknik Gereksinimler
- **Backend**: Node.js + Express.js + TypeScript
- **Veritabanı**: SQLite (Sequelize ORM)
- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand + React Query
- **Styling**: TailwindCSS + Headless UI + Framer Motion
- **Authentication**: JWT (access + refresh token)

## Kapsam

### Dahil Olanlar
- Web tabanlı uygulama (responsive, mobil uyumlu)
- Kullanıcı kimlik doğrulama sistemi
- Ders ve kategori yönetimi
- Haftalık planlayıcı (drag & drop)
- Pomodoro timer
- İstatistik ve analiz dashboard'ı
- Bildirim sistemi
- Dark/Light mode

### Dahil Olmayanlar
- Mobile app (React Native)
- Sosyal özellikler (gruplar, rekabet)
- AI entegrasyonu
- Email gönderim servisi (isteğe bağlı)

## Başarı Kriterleri
- Lighthouse score: 90+ (tüm kategorilerde)
- API response time: <200ms
- Mobil uyumluluk: 100%
- Türkçe dil desteği
- Erişilebilirlik: WCAG 2.1 uyumluluğu

## Proje Kısıtlamaları
- Modern tarayıcı desteği (Chrome 90+, Firefox 88+, Safari 14+)
- İnternet bağlantısı gerektirir (offline PVA desteği yok)
- Tek dil desteği (Türkçe)

## Hedef Kitle
- TYT/AYT sınavına hazırlanan öğrenciler
- Üniversite öğrencileri
- Kendi öğrenme sürecini takip etmek isteyen herkes