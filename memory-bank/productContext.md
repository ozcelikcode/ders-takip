# Ders Takip Sistemi - Product Context

## Neden Bu Proje Var?

### Çözülen Problem
Öğrencilerin ders takibi ve zaman yönetiminde yaşadığı temel zorlukları çözmek için:

1. **Dağınık Çalışma Planları**: Öğrenciler genellikle hangi derste ne kadar çalıştıklarını takip edemez
2. **Motivasyon Eksikliği**: İlerleme görememek motivasyon düşüklüğüne neden olur
3. **Zaman Yönetimi**: Haftalık/daily planlama yapmak zordur, özellikle birden fazla ders çalışırken
4. **İstatistik Takibi**: Hangi derste daha başarılı olduklarını görememek

### Hedef Kullanıcı Deneyimi
**Ana senaryo**: Bir TYT öğrencisinin günlük akışı
1. Sabah güne başlarken bugünkü planını görür
2. Haftalık planlayıcıda görevleri sürükleyerek günlerine yerleştirir
3. Çalışmaya başladığında Pomodoro timer'ı kullanarak odaklanır
4. Akşam günün istatistiklerini kontrol eder ve gelecek planını yapar

### Temel Değerler
- **Basitlik**: Karmaşık arayüzlerden kaçınma, sade ve anlaşılır UI
- **Güvenilirlik**: Kaybolan veriler, yavaş performans olmamalı
- **Motivasyon**: Başarı hissi veren, ilerlemeyi gösteren feedback
- **Esneklik**: Kullanıcı kendi sistemini kurgulayabilmeli

## Nasıl Çalışmalı?

### Haftalık Planlayıcı
- 15 dakikalık grid sistem
- Drag & drop görev taşıma
- Görev boyutunu otomatik ayarlama (1 saat = 4 grid kutu)
- Color coding ile kategori ayrımı
- Sağ click ile hızlı menü (düzenle, sil, tamamla)

### Pomodoro Timer
- Özelleştirilebilir süreler (25dk çalışma, 5dk mola default)
- Timer bitince bildirim
- Çalışma istatistiklerini otomatik kayıt
- Minimize edilebilir mini timer

### İstatistikler
- Günlük/haftalık/aylık çalışma saatleri
- Ders bazında dağılım grafiği
- Hedef vs gerçekleşen karşılaştırması
- Verimlilik analizi (hangü günlerde daha verimli)

## Kullanıcı Journey'leri

### Yeni Öğrenci
1. Kayıt ol → profil bilgilerini gir
2. İlgili dersleri/kategorileri ekle
3. İlk haftalık planını oluştur
4. İlk çalışma seansını başlat
5. İlk gün sonunda ilerleme grafiğini gör

### Mevcut Kullanıcı (Günlük Akış)
1. Dashboard'da bugünkü planı gör
2. Gerekiyorsa planını güncelle (drag & drop)
3. Pomodoro ile çalışmaya başla
4. Çalışma sonrası notlar ekle (opsiyonel)
5. İstatistikleri kontrol et
6. Yarın için plan yap

## Başarı Metrikleri

### Kullanıcı Etkileşimi
- Daily active users (DAU)
- Ortalama oturum süresi
- Haftalık plan oluşturma oranı
- Pomodoro kullanım oranı

### İşlevsel Başarı
- Plan oluşturma süresi < 2 dakika
- Görev ekleme süresi < 30 saniye
- Sayfa yükleme süreleri < 2 saniye
- Mobil kullanım oranı > 30%

## Farklılaşma Noktaları

1. **Türkiye Odaklı**: TYT/AYT müfredatına özel optimizasyon
2. **Pomodoro Entegrasyonu**: Sadece planlama değil, çalışma deneyimi
3. **Basit Arayüz**: Rakiplerin karmaşık arayüzüne karşı sade yaklaşım
4. **Türkçe Dil Desteği**: Tam yerelleştirilmiş deneyim

## Gelecek Vizyonu

### Kısa Vade (3-6 ay)
- Temel özellikleri mükemmelleştirme
- Mobil uygulama (PWA)
- Tema ve özelleştirme seçenekleri

### Orta Vade (6-12 ay)
- AI destekli çalışma önerileri
- Sosyal özellikler (arkadaşlarla paylaşım)
- Gelişmiş raporlama

### Uzun Vade (1+ yıl)
- Öğrenci grupları ve rekabet
- Online ders entegrasyonu
- Eğitim içerik pazarı