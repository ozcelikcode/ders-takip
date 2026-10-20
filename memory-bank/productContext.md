# Çalışma ve Görev Takip Sistemi — Product Context

Son güncelleme: 21 Ekim 2026 (R15: 19 Ekim ürün yönü kararına göre yeniden yazıldı; eski öğrenci/TYT senaryoları Git geçmişindedir).

## Neden var?

İnsanlar ne üzerinde çalıştığını, ne kadar zaman ayırdığını ve hedefe ne kadar yaklaştığını tek yerde göremiyor. Plan bir yerde, sayaç başka yerde, ilerleme hiçbir yerde. Bu ürün; alanı ne olursa olsun (okul, iş, kişisel hedef, beceri) çalışmayı planlamak, odakla yapmak ve gerçekten ölçülen süreyle görmek için tek, sade bir yer sunar.

### Çözdüğü problemler

1. **Dağınık plan:** Ne zaman neye çalışılacağı belirsiz. → Takvimde seans planlama, bugünün listesi.
2. **Görünmeyen ilerleme:** Ne kadar çalışıldığı bilinmiyor; planlanan ile yapılan karışıyor. → Yalnız ölçülen süre sayılır; hedefle karşılaştırma.
3. **Kişiye uymayan araçlar:** Hazır sistemler tek bir kitleye göre kurulu. → Kelime seti, kişisel kategoriler, kendi hedefleri ve ritmi.
4. **Nereden başlanacağı belirsiz:** Boş ekran. → İlk kurulum sihirbazı ve panoda kişisel öneriler.

## Temel değerler

- **Sadelik:** Az ama net ekran; her şey bir menü kadar düzenli.
- **Güvenilirlik:** Veri kaybolmaz; ölçüm doğru; değişiklik çakışmaları açıkça yönetilir.
- **Kişiye uyum:** Kullanıcı kendi kelimelerini, kategorilerini, hedeflerini ve ritmini seçer.
- **Dürüst ilerleme:** Planlanan değil, ölçülen süre; teşvik edici ama abartısız geri bildirim.
- **Veri sahipliği:** Kullanıcı verisini indirebilir ve hesabını silebilir.

## Kullanıcı yolculukları

### Yeni kullanıcı
1. Kayıt olur (tarayıcı saat dilimi otomatik gelir) ya da admin hesap açar.
2. Kurulum sihirbazı: amaç (okul, iş, kişisel, beceri, diğer) → kelime seti; saat dilimi, hafta başı, aktif günler, günlük hedef (saat ve/veya dakika; haftalık hedef otomatik); odak ritmi; kişisel kategori ve ilk kayıtlar (kutucuklar). İsterse atlar.
3. Panoda kendisine göre öneriler görür (ör. "Bugün için bir seans planla", "X için alt kayıt ekle").

### Günlük akış
1. Panoda bugünkü hedef, öneriler ve haftalık ilerlemeyi görür.
2. Planlayıcıda seansları yerleştirir ya da taşır.
3. Odak sayacıyla çalışır; süre ölçülür.
4. Gerekirse seansa not ekler; aramayla eski notları bulur.
5. İstatistiklerde aralık seçip dağılımı ve hedefi karşılaştırır.

### Yönetici
Kullanıcıları ve ortak kataloğu yönetir, site kimliğini ve varsayılan kelime setini seçer, yedek alır, şifre sıfırlama bağlantısı verir.

## Nasıl çalışmalı?

- **Planlayıcı:** Günlük/haftalık görünüm, sürükle-bırak, klavye ile oluşturma, iki sekmede çakışmada açık uyarı.
- **Odak sayacı:** Süreler kullanıcı ritminden gelir; faz durumu sunucuda tutulur, sayfa yenilense de sürer.
- **Hedefler:** Günlük hedef yalnız aktif günlerde geçerli; haftalık hedef = günlük hedef × aktif gün.
- **İstatistik:** Ölçülmemiş eski süreler toplama girmez; bu açıkça belirtilir.
- **Arama:** Büyük/küçük harf ve Türkçe harf farkı gözetmez; yalnız kullanıcının görebildiği veride arar.

## Başarı göstergeleri (hedef; ölçüm altyapısı yok)

- Yeni kullanıcının ilk seansı planlaması 2 dakikadan kısa.
- Kurulumu tamamlayan ya da bilinçli atlayan hesap oranı.
- Haftalık hedefe ulaşılan hafta oranı.
- Mobil kullanımda sorunsuz akış (yatay taşma yok, dokunma hedefleri yeterli).

## Ayrışma

1. **Alan bağımsız ve kişiye uyarlanabilir:** Kelime seti, kişisel kategori, hedef ve ritim kullanıcıda.
2. **Ölçülen süre:** Plan ile gerçekleşen ayrılır.
3. **Planlama + odak + istatistik tek yerde.**
4. **Türkçe öncelikli, sade arayüz;** çeviri altyapısı yol haritasında (R10).

## Bilinçli olarak şimdilik yok

Yapay zekâ önerileri, sosyal/rekabet, çevrimdışı/PWA, mobil uygulama, eğitim içeriği. Panodaki öneriler kural tabanlıdır (yapay zekâ değil).

## Mevcut karar notları

- **Tasarım (15 Ekim):** Nötr, sade, Vercel/Geist çizgisi; `design-system.md`.
- **Marka (16 Ekim):** Site adı/logo admin ayarından; kod adlarına bağlanmaz.
- **Plan ve seans (17 Ekim):** Takvim ve sayaç `StudySession` üzerinden çalışır; Plan isteğe bağlı tarihli hedef kabıdır, seans için zorunlu değildir ve tarihten otomatik türetilmez. Plan silmek seans/ölçüm geçmişini silmez.
