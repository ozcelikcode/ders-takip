# Çalışma ve Görev Takip Sistemi — Project Brief

Son güncelleme: 21 Ekim 2026 (R15: belge, 19 Ekim ürün yönü kararına göre yeniden yazıldı).

## Ürün yönü (kullanıcı kararı, 19 Ekim 2026)

Ürün alan ve kitle bağımsız, global ve değişken odaklı bir çalışma/görev takip sistemidir. Okul, iş, kişisel hedef, beceri ya da başka herhangi bir alan için kullanılabilir; hiçbir ekran, tip, varsayılan veya metin tek bir sınava, müfredata ya da kitleye bağlanmaz. İlk sürümün TYT/AYT öğrencisi odağı geçersizdir ve yalnız Git geçmişinde tarihsel bilgi olarak kalır. Sıralı yol haritası ve durum `progress.md` başındadır.

## Amaç

Herkesin kendi çalışma alanını kurup işini planlayabildiği, odaklanarak çalışabildiği ve gerçekten ölçülen süreyle ilerlemesini görebildiği sade bir web uygulaması.

## Çalışma standardı (15 Ekim 2026)

Mevcut koddan disiplinli, sürdürülebilir, ileri düzey mühendislikle devam edilir. Kullanılmayan, tekrarlı, eskimiş veya varsayımsal kod tutulmaz; desteklenen kararlı teknolojiler ve doğrulanabilir değişiklikler esastır. Kod sembolleri, paketler ve dosya/klasör adları İngilizce; kullanıcıya görünen içerik Türkçe kalır. Kalıcı kurallar: `workingPrinciples.md`. Bu belgedeki gereksinimler ürün hedefidir; uygulanmış durumun kanıtı `progress.md`, teknik envanter `techContext.md` içindedir.

## Temel kavramlar

- **Kayıt, alt kayıt, seans:** Çalışılan şey (kayıt), onun parçaları (alt kayıt) ve takvimdeki çalışma bloğu (seans). Görünen kelimeler ayarlanabilir: site geneli için admin, kişisel olarak her kullanıcı bir kelime seti seçer (Genel: proje/görev/seans, Eğitim: ders/konu/seans, Hedef: hedef/adım/seans, Beceri: beceri/alıştırma/seans). Kod ve veri hep aynı İngilizce kavramları kullanır (course/topic/session).
- **Kategori:** Kayıtları gruplar. Ortak kategorileri admin yönetir; her kullanıcı yalnız kendine görünen kişisel kategoriler açabilir.
- **Ölçülen süre:** İstatistik ve hedefler planlanan değil, gerçekten ölçülen çalışma süresine dayanır; molalar ve duraklamalar hariçtir.

## Kullanıcı rolleri

- **Kullanıcı:** Kendi çalışma alanı, kişisel kategoriler, planlama, odak sayacı, hedefler, istatistik, arama, verisini indirme ve hesabını silme.
- **Yönetici:** Ek olarak kullanıcı yönetimi, ortak kategori ve kayıtlar, site kimliği ve ayarları, yedekleme, şifre sıfırlama bağlantısı. Son etkin yönetici silinemez.

## Ana özellikler (uygulanmış; ayrıntı ve kanıt `progress.md`)

1. **İlk kurulum sihirbazı:** Yeni hesap amacını, zamanını (saat dilimi, hafta başı, aktif günler, saat/dakika olarak günlük hedef), odak ritmini ve ilk kayıtlarını seçer; sayfası buna göre hazırlanır. Atlanabilir ve yeniden başlatılabilir.
2. **Planlayıcı:** Günlük/haftalık takvim, sürükle-bırak, çakışma ve sürüm kontrolü.
3. **Odak sayacı (Pomodoro):** Sunucuda tutulan faz durumu, ayarlanabilir süreler.
4. **Hedefler ve öneriler:** Günlük hedef aktif günlerde uygulanır, haftalık hedef ondan türetilir; panoda kişisel öneriler.
5. **İstatistikler:** Aralık seçimi, kategori/kayıt dağılımı, hedefle karşılaştırma.
6. **Arama:** Kayıt, alt kayıt ve seanslarda; büyük/küçük harf ve Türkçe harf farkını yok sayar, yetki kapsamına uyar.
7. **Hesap:** Şifre sıfırlama (SMTP veya admin bağlantısı), veriyi JSON indirme, şifreyle hesap silme.
8. **Yönetim:** Kullanıcılar, ortak katalog, site kimliği/kelime seti/güvenlik ayarları, yedek ve geri yükleme.

## Kapsam dışı (şimdilik)

Mobil uygulama, sosyal/rekabet özellikleri, yapay zekâ entegrasyonu, çevrimdışı/PWA. Arayüz çevirisi (R10) ve bildirim teslimatı (R11) yol haritasında bekliyor.

## Başarı ölçütleri

- Erişilebilirlik: otomatik axe taramalarında ihlal yok (açık/koyu tema); tam WCAG ve ekran okuyucu doğrulaması ayrıca yapılmalı.
- Lighthouse: mobil ve masaüstünde performans 90+ hedefi (son ölçüm `progress.md` R9).
- Kullanıcı verisi korunur: açık migration, işlem öncesi yedek, yıkıcı komut yok.
- Strict TypeScript, sıfır uyarılı lint, `npm run check` ve E2E yeşil.

## Kısıtlar

- Tek arayüz dili Türkçe (R10'a kadar); tarih/sayı biçimi `lib/locale.ts` tek kaynağından.
- İnternet bağlantısı gerekir; SQLite tek dosya veritabanı.
- Modern tarayıcılar; E2E Chromium, WebKit ve mobil Chromium üzerinde koşar.

## Tasarım (15 Ekim 2026)

Modern, sade, özenli; Vercel/Geist ve Linear çizgisi: nötr yüzeyler, belirgin tipografi, ince sınırlar, anlamlı renk. Eski pastel/iOS/cam yönü geçersizdir. Kurallar `design-system.md` içindedir.

## Değiştirilebilir marka (16 Ekim 2026)

Görünen site adı, logo, ikon ve açıklama admin ayarından değişir; kod, depo ve paket adları buna bağlanmaz. Ayrıntı `implementation/2026-10-16-preferences-and-site-identity.md`.
