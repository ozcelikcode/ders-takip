# Görsel Tasarım Sistemi

Kaynak: Kullanıcının 15 Ekim 2026 tarihli açık talimatı. Modern, basit, sade ve özenli bir ürün arayüzü isteniyor; Vercel referans olarak belirtildi. Önceki iOS/pastel/glassmorphism tercihi geçersizdir.

Doğrulama sayıları bu tasarım paketinin tarihsel kapanışına aittir. Güncel toplam ve sonraki mühendislik değişiklikleri progress.md / implementation/2026-10-15-security-and-recovery.md içindedir.

## Referans incelemesi

15 Ekim 2026'da güncel resmî kaynaklar incelendi:

- [Vercel Geist](https://vercel.com/geist/introduction): tutarlı bileşen ve yüzey sistemi.
- [Geist renkler](https://vercel.com/geist/colors): varsayılan gri metin/ikon/sınırlar, iki temel arka plan, az ve anlamlı renk kullanımı.
- [Geist tipografi](https://vercel.com/geist/typography) ve [Geist font](https://vercel.com/font): okunabilirlik, belirgin ama ölçülü hiyerarşi.
- [Linear](https://linear.app/features): ürün odaklı düzen ve sade bilgi hiyerarşisi. Site tarayıcıda görsel olarak da incelendi.

Bunlar bütün 2026 tasarımlarının sıralaması değildir. Ürüne uygun kararlar bu kaynakların yorumudur; Vercel logosu/markası veya birebir sayfa kopyası kullanılmaz.

## Kalıcı kurallar

- Nötr beyaz/gri/siyah yüzeyler; semantik CSS değişkenleri: canvas, surface, sidebar, subtle, line, text, muted, solid, solid-text.
- Açık tema: #fafafa canvas, #fff surface, #171717 metin, #666 ikincil metin, #e5e5e5 sınır. Koyu tema: #0a0a0a canvas, #111 surface, #ededed metin, #a1a1a1 ikincil metin, #2a2a2a sınır.
- Birincil eylem yüksek kontrastlı nötr düğme; ikincil eylem ince çerçeveli. Kullanıcı vurgu rengi odak/bağlantı/seçim alanlarında korunur; bütün yüzeyler bu renkle boyanmaz.
- Geist Variable yerel npm paketiyle yüklenir. Uzak Google Fonts bağlantıları kaldırıldı. Latin ve Latin Extended glifleri Türkçe metinleri destekler; font-display swap kullanılır.
- Sayfa başlığı 28–32 px, gövde çoğunlukla 14 px, yardımcı metin 12 px; normal/medium ağırlıklar, sayılarda tabular-nums. Her başlık dev/bold olmamalı.
- 4 px temelli boşluklar; panellerde yaklaşık 8 px, düğmelerde 6 px köşe. Birbirinin içine yerleştirilmiş büyük yuvarlak kartlar, dekoratif gradyan, cam efekti ve büyük gölgeler kullanılmaz. Açılır panel/dialog gölgesi katman anlamını taşır.
- Renk; başarı/uyarı/hata, ders/seans kimliği gibi anlamlı durumlar içindir. Takvimde nötr metin, hafif renk tonu ve renkli kenar kullanılır; metin okunabilirliği kullanıcının seçtiği renge bırakılmaz.
- Hareket kısa ve işlevsel; CSS reduced-motion ve Framer Motion reducedMotion=user uygulanır. Konfeti kaldırıldı; mevcut toast tamamlanma geri bildirimi sağlar.
- Türkçe arayüz korunur. Kod/dosya adları İngilizce olmalıdır. Yeni sayfalar PageHeader ve ortak panel/düğme alanlarını kullanır; eski görünüm ikinci bir alternatif olarak saklanmaz.

## Uygulanan kapsam

- Layout, Sidebar, Header; 232 px masaüstü navigasyon, sade aktif durum, bölüm yolu, tek mobil overlay.
- Mobil menü Headless UI Dialog: odak sınırı, Escape, kapanınca odağın geri dönmesi. İçeriğe geç bağlantısı ve ikon düğmesi adları eklendi.
- Dashboard: ortak başlık, tek özet şeridi, sabit viewport yüksekliği yerine doğal sayfa akışı; sade grafik/aktivite ve hızlı erişim.
- Ders sayfası: sola hizalı başlık, ortak eylemler, sade kartlar ve arama. Giriş/kayıt, loading, Pomodoro ve kullanıcı ayarları aynı yüzey/tipografi yönüne uyarlandı. Admin avatar gradyanları kaldırıldı.
- Planlayıcı: kompakt açılır günlük özet, günlük/haftalık kontrolü, sabah 08:00'e ilk kaydırma, içeride kaydırılan 24 saatlik takvim, haftalık görünümde sabit gün başlıkları. 639 px ve altında ilk açılış günlük görünüm; kullanıcı iki görünüm arasında geçebilir.
- Seans formu: nötr dialog/yüzey/seçim alanları, ortak birincil düğme ve isimli kapatma düğmesi. İş kuralları/timer motoru yeniden yazılmadı.
- Pomodoro: renkli dairesel SVG/gradyan gösterimi yerine büyük tipografik sayaç, ince erişilebilir progressbar ve isimli ortak kontroller kullanılır. Seans seçimi klavyeyle erişilebilir düğmedir; timer motorunun doğruluk backlog'u korunur.
- Konfeti uygulamaları ve canvas-confetti/@types bağımlılıkları kaldırıldı. Planner'daki iki eski @ts-ignore kaldırıldı; strict kontrol geçiyor.

## Küçük doğruluk düzeltmeleri

- Dashboard includeTopics ile gerçek konu sayısını okur. Yanlış category===TYT/AYT karşılaştırmaları kaldırıldı; ders, konu, tamamlanan seans ve kaydedilen süre gösteriliyor. Hata/yüklenme sırasında sayı uydurulmaz.
- Süre hâlâ mevcut backend duration değeridir; “gerçek odak süresi” iddiası yok. A09 ve admin agregasyonları açıktır.
- Dashboard ve ders sayfası aynı query key için aynı ham response biçimini kullanır; dashboard select ile görünüm verisine geçer.
- Son aktiviteler/bildirimler completion/end zamanına göre gerçekten en yeni beşi seçer; ortak yardımcı cache dizisini yerinde sıralamaz. Üç regresyon testi eklendi.
- Günlük özet cache dizisini mutate etmez; yüklenme ve hata durumları ayrıdır. GET'in iptal edeceğini varsayan gereksiz ikinci polling effect'i kaldırıldı; ana sorgunun yenilemesi korunur.

## Doğrulama ve sınırlar

- npm run check: İngilizce/ASCII adlandırma, iki workspace strict typecheck, sıfır uyarılı lint, 22 backend + 8 frontend = 30 test ve iki production build başarılı.
- Geçici SQLite/hesap ile son production bundle tarayıcı kontrolü: giriş, dashboard/ders geçişi ve sayılar, haftalık/günlük görünüm, günlük özet aç/kapat, ders araması, seans formu, Pomodoro gösterimi/klavyeyle seans seçimi ve mobilde özel seans oluşturma.
- 390×844 mobil viewport: günlük varsayılan, menü/odak/Escape, arama; ölçülen sayfa genişliği viewport ile aynı (382 CSS px içerik alanı; tarayıcı scrollbar alanı ayrı).
- Açık/koyu temalar görsel olarak kontrol edildi. Tema seçiminin backend senkronu A11 nedeniyle 400 döndürüyor; yerel görünüm değişmesi cihazlar arası kalıcılık kanıtı değildir. Yeniden yüklemede sunucu tercihi baskın gelebilir.
- Yeniden build edilen dist içindeki eski hash'li chunk'ı açık sekme isteyince geçici bir dynamic-import hatası gözlendi; son build yeniden yüklenerek tekrar kontrol edildi. Dağıtımda eski asset saklama/cache stratejisi ayrıca tasarlanmalı.
- Otomatik tarayıcı E2E paketi, tam WCAG/Lighthouse, dokunarak sürükleme/resize ve tüm admin akışları doğrulanmış değildir. Bu çalışma güvenlik/veri bütünlüğü backlog'unu kapatmaz.
- Gerçek kullanıcı DB'sinde seed/migration/reset/restore yapılmadı; testler geçici dizinde çalıştı; test oturumundan çıkıldı, sekme/sunucu kapatıldı ve geçici DB temizlendi. Commit/push/deployment yapılmadı.

Görsel kanıtlar repo dışında Codex görselleştirme dizininde planner-modern-light.jpg, planner-modern-dark.jpg, planner-modern-mobile.jpg, dashboard-modern.jpg ve pomodoro-modern.jpg adlarıyla tutulur. Bunlar kurmaca test verisi içerir.
