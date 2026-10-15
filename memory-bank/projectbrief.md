# Ders Takip Sistemi - Project Brief

## Güncel Kaynak ve Zorunlu Çalışma Standardı (15 Ekim 2026)

Kullanıcı projeye mevcut koddan devam edilmesini, önce ileri düzey teknik değerlendirme yapılmasını ve bundan sonra disiplinli, derli toplu, sürdürülebilir mühendislik uygulanmasını istedi. Gereksiz/kullanılmayan/eskimiş kod tabanı biriktirilmez; desteklenen kararlı teknolojiler ve doğrulanabilir değişiklikler esastır. Kalıcı ayrıntılar: `workingPrinciples.md`. Kod sembolleri, paketler ve dosya/klasör adları İngilizce; kullanıcı içeriği Türkçe kalır.

Bu belgedeki gereksinimler ürün hedefidir; tamamlanmışlık kanıtı değildir. Kaynakla doğrulanmış mevcut durum `techContext.md`, açık işler `progress.md`, 15 Ekim teknik değerlendirmesi `audits/2026-10-15-project-audit.md` içindedir. Öncelik mevcut ürünün güvenlik, veri bütünlüğü, derleme ve işlevsel doğruluğudur.

İlk ürün odağı öğrenciler/TYT-AYT idi. Mevcut README ve seed genel görev/iş takibine de açılmıştır; kapsam genişlemesi yeni özelliklerden önce netleştirilmelidir. Kullanıcı adına yeni ürün yönü kararı alınmamıştır.

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

### Başlangıç Teknik Seçimleri

Aşağıdaki liste projenin tarihsel başlangıç stack'idir. Güncel kaynak envanteri `techContext.md` içindedir. Yeni geliştirmeler desteklenen kararlı sürümleri esas alır; React 18 gibi eski bir major sürüme bağlı kalma zorunluluğu yoktur.
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
- Modern tarayıcı desteği; güncel araç zinciri seçildiğinde destek matrisi yeniden belirlenip test edilmelidir. Önceki Chrome 90+/Firefox 88+/Safari 14+ hedefi doğrulanmış uyumluluk sayılmaz.
- İnternet bağlantısı gerektirir (offline PVA desteği yok)
- Tek dil desteği (Türkçe)

## Hedef Kitle
- TYT/AYT sınavına hazırlanan öğrenciler
- Üniversite öğrencileri
- Kendi öğrenme sürecini takip etmek isteyen herkes

## Güncel görsel gereksinim — 15 Ekim 2026

Kullanıcı modern, basit, sade ve özenli; Vercel benzeri tasarım istedi. Güncel Geist/Linear resmî kaynakları incelenerek nötr yüzey, belirgin tipografi, ince sınır ve anlamlı renk standardı uygulandı. Eski pastel/iOS/cam yönü geçersizdir. Kalıcı kurallar, uygulama kapsamı ve kanıt sınırları `design-system.md` içindedir. Türkçe kullanıcı içeriği korunur.
