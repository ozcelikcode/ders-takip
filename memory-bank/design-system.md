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
- Pomodoro: renkli dairesel SVG/gradyan gösterimi yerine büyük tipografik sayaç, ince erişilebilir progressbar ve isimli ortak kontroller kullanılır. Seans seçimi klavyeyle erişilebilir düğmedir; A15 ile sayfa/modal aynı timer bileşenini kullanır. Faz değişimi aria-live durum alanında duyurulur; başlat/duraklat/sıfırla/tamamla isimlidir. Pencereyi kapatmanın duraklatmadığı açıkça yazılır.
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

## Değiştirilebilir site kimliği (16 Ekim 2026)

Görünen ad/açıklama/logo/ikon admin ayarıdır. Ortak Brand, login/register/sidebar/loading ve document title/meta/favicon aynı public DTO'yu kullanır. Uzun adlar düzende truncate edilir, tam ad title/erişilebilir link metninde korunur; sabit ürün adı yeni ekrana yazılmaz. Repo/paket adları İngilizce teknik kimliktir. Yeni ikon SVG'leri mevcut Lucide setinden, lisansı assets yanında korunarak gelir. Marka değişikliği sade nötr tasarım dilini değiştirmez.

## Süre ve saat dilimi metinleri — 16 Ekim

Dashboard “Ölçülen çalışma” gösterir; çalışma/mola/duraklama ayrı, ölçülmemiş eski süreler açıkça hariçtir. Planner süreleri plan dakikasıdır. Takvim ve form seçili timezone'u gösterir; stored instant UTC kalır. Bu metin/doğruluk güncellemesi önceki görsel sistemini değiştirmez. Güncel davranış/kanıt implementation/2026-10-16-study-time-and-timezones.md içindedir; yukarıdaki eski süre/A09 ve test sayıları tasarım paketinin tarihsel kapanışıdır.

## Ortak takvim ve dialog — 16 Ekim

A21 planner alt paketinde günlük/haftalık kartlar tek CalendarSessionCard ve nötr panel/grid token kullanır; kategori/seans rengi ince sol şeritle sınırlıdır. Başlat/duraklat/tamamla/sayaç/işlemler isimlidir; küçük kartta title ve işlemler korunur. ConfirmDialog nötrdür; yıkıcı eylem kırmızı, async bekleme/hata açık, pending kapama kilitlidir. MoveSessionModal Headless UI odak/Escape ve isimli gün seçimi kullanır. Tam WCAG/mobil/touch iddiası yoktur; komşu çok kısa kartların minimum hit alanı ve grid klavye odağı A22 kapsamındadır. Kalan diğer modal/admin dönüşümü A21'de açıktır. Kanıt/sınırlar: implementation/2026-10-16-shared-planner.md.


## Katalog ve admin ders yüzeyleri — 16 Ekim

CoursesPage, CourseDetailPage ve AdminCoursesPage nötr panel/yüzey/typography/btn sınıflarını kullanır. Ders rengi küçük simgeyle sınırlıdır; konu durumları renkli büyük kart yüzeyi yerine erişilebilir pressed state taşıyan kompakt düğmelerle gösterilir. Kartın detay linki ve düzenle/sil düğmeleri ayrı etkileşim alanıdır. Mobilde kontroller/satırlar wrap eder; bu pakette yeni manuel mobil/touch doğrulaması yapılmadı.

CourseEditorModal / TopicEditorModal tek EditorDialog kullanır; etiketli native input/select, doğrulama açıklaması, server error, pending ve Headless UI focus/Escape vardır. Admin için ikinci bir ders formu tutulmaz. Arşiv/sil onayları farklı veri etkilerini açıklar. Kalan ayar/yedekleme modal ve admin yüzeyleri A21'de açıktır; tam WCAG iddiası yoktur. Kanıt ve 223 testlik güncel kalite tabanı: implementation/2026-10-16-catalog-editing.md.


## Kategori yönetimi — 17 Ekim

Liste ve CategoryEditorModal nötr yüzey/tipografi/düğme token'larını kullanır; renk yalnız küçük simgededir. Eski renkli preset butonları/ikinci ikon haritası yerine etiketli HEX alanı ve ortak ikon select kullanılır. Pasif kayıt görünürdür. Parent yönetim Dialog'u ve çocuk edit/onay Headless UI odak/Escape sınırını paylaşır; pending kapama kilidi ve hata/boş ayrımı vardır. Masaüstü production fixture ve 13 yeni davranış testi doğrulandı; mobil/touch/tam WCAG iddiası yoktur. Kullanıcı/ayar/yedekleme yüzeyleri A21'de açık kalır. Detay: implementation/2026-10-17-category-management.md.


## Kullanıcı yönetimi — 17 Ekim 2026

Admin kullanıcı listesi nötr panel satırları, ince sınır, tipografik rol/pasif/öz-hesap işaretleri ve ölçülen çalışma özetini kullanır; renkli istatistik kartları kaldırıldı. Erişilebilir adlandırılmış arama/sayfalama/menü; EditorDialog etiketli alanları, inline hata ve pending fieldset kilidi sunar. Rol/durum/silme onayları somut etkisini açıklar ve sunucuyu bekler. Form Escape/odak dönüşü tarayıcıda, pending/epoch/hata testlerde doğrulandı; kapsamlı WCAG/mobil E2E hâlâ A22 kapsamındadır.


## Site ayarları ve yedekleme — 17 Ekim 2026

AdminSettingsPage nötr PageHeader, sarmalanan bölüm düğmeleri, etiketli input/checkbox ve açık dirty/pending/error durumunu kullanır. BackupPanel ince sınır ve yatay kaydırılabilen caption/başlıklı tabloyla tarih/tür/boyut/doğrulamayı gösterir; doğrulanmamış kayıt kilitlidir. Reset/restore ortak async ConfirmDialog kullanır; kapsam ve oturum etkisi açıktır. Bildirim teslimatı/offsite/saklama altyapısının bulunmadığı belirtilir. Masaüstü fixture taslak/bölüm/Escape/odak/backup create doğrulandı; mobil/WCAG/E2E iddiası yoktur. Detay: implementation/2026-10-17-admin-settings-and-backups.md.


## Yönetim özeti ve seans yüzeyleri — 17 Ekim 2026

Yönetim özeti nötr PageHeader/özet şeridi, ince sınır ve semantik kullanıcı/seans listeleri kullanır; global sayılar/ölçülen süre ile loading/error/empty ayrıdır. TodaysPlans nötr açılır günlük özet ve seans adıyla etiketli komutlar sunar. CreateSessionModal/PomodoroModal panel/input/düğme token'larına taşındı; renk yalnız mevcut seans kimliği ve anlamlı durum/yıkıcı eylemdedir. Renk/tür seçimleri isimli pressed state taşır; minimized Pomodoro viewport genişliğine uyar. Masaüstü production fixture ve 24 yeni davranış regresyonu geçti; bu pakette yeni mobil/tam WCAG/E2E kanıtı yoktur. Detay: implementation/2026-10-17-admin-and-session-surfaces.md.


## A19 form doğrulaması — 17 Ekim 2026

Görsel dil değişmedi. Giriş/kayıt ortak sözleşme mesajlarını kullanır; seans formu API ile aynı 1–1440 gerçek dakika sınırını sunar ve geçersiz request için görünür hata gösterir. Request/view adaptörü ayrıdır; Türkçe içerik ve saklı renkler korunur. Yeni form regresyonları gerçek React/RHF üzerindedir; yeni manuel tarayıcı/WCAG kanıtı yoktur.

## A22 Header/takvim erişim paketi

Header bildirim/hesap paneli nötr dropdown-panel ve ince sınırları kullanır. Hata, eski veri ve gerçek boş durum metinle ayrılır. Bildirim eylem sonucu canlı duyurulur. Takvim boş saatte görünür focus outline ve küçük ekranlarda ekleme işareti sunar; ok/Home/End gezinme açıklaması görünürdür. Native etiketli saat/süre alanları sürükleme zorunluluğunu kaldırır; modal viewport yüksekliğinde kaydırılır. Küçük kart komutları en az 24×24 px, başlık en az 24 px yüksekliktedir; gerçek dokunmatik hedef/komşu kısa kart yerleşimi ve tam WCAG ayrıca doğrulanacaktır.

## A22 kısa kartlar

Görsel minimum kart yüksekliği 28 px, iç başlık/ikon hedefi en az 24 px; 68 px altı tek satırlı kompakt düzen kullanılır. Aynı piksel aralığında çakışan komşu/iptal kartlar ayrı sütunlardır; her sütun en az 160 px olur. Yoğun gün takvim içinde yatay kaydırılır, saat/gün başlıkları aynı kolonlara hizalanır. Boş haftalık gün minimumu 104 px korunur. 36 px son gutter kart/odak kesilmesini önler; kısa kartlarda resize tutamacı hedefi örtmez, saat/süre dialog'u kullanılır. Gerçek zaman/duration değiştirilmez. Bu masaüstü/geometri kanıtıdır; gerçek dokunmatik cihaz ve tam WCAG ayrıca açıktır.

## A22 otomatik tarayıcı kanıtı — 18 Ekim 2026

Görsel token/düzen değiştirilmedi. Taşıma dialog'undan odak dönüşü React kapanış commit'i/Headless UI passive cleanup sonrasına taşındı; bekleyen RAF unmount'ta iptal edilir. Gerçek production bundle ile kısa kart hedefleri, gün sonu odak, native saat/süre, Header ve mobil menü Chromium/WebKit desktop ve 412×839 Chromium touch emülasyonunda otomatik doğrulanır. Bu 18 yürütme tam WCAG, Lighthouse veya fiziksel touch cihazı başarısı değildir; kalanlar progress.md'dedir.

## A22 ölçülmüş erişilebilirlik — 18 Ekim 2026

Görsel hiyerarşi korunarak auth main/h1, profil başlık sırası, alan etiketleri/ikon adları/pressed state, Header'ın içerikten gelen adı ve admin tanım listesi düzeltildi. Düşük kontrastlı yardımcı/aktif metinler nötr token'lara alındı; “bugün”, dakika modu ve dosya/URL/gün seçimleri özel vurgu renginden bağımsız okunur. Header Ara min 24 px; ayar şifre düğmeleri 32×32 px. Kişisel renk ve saklı seans renkleri değiştirilmedi. Varsayılan+target-size axe taraması 150 durumda 0 violations; incomplete kayıtlar ve tam manuel WCAG/ekran okuyucu sınırı korunur. Dört Lighthouse ekran/profilinde accessibility 100 olsa da mobil performans 67/61; görsel sadeleşme performans hedefinin karşılandığı anlamına gelmez. Ayrıntı implementation/2026-10-18-accessibility-and-lighthouse.md.
