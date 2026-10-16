# Gerçek Çalışma Süresi ve Saat Dilimi — 16 Ekim 2026

## Kapsam ve veri politikası

Kullanıcı sıradaki pakete devam edilmesini istedi. A09 ve A16: planlanan süreyi ölçülen süreden ayırma, çalışma/mola/duraklama aralıkları ve kullanıcı saat diliminde takvim/rapor doğruluğu. Önceki A07/A08 uygulaması korunur; commit/push/deployment yapılmaz.

`duration` mevcut sözleşmede planlanan dakika olarak kalır. `startTime/endTime` plan zamanlarıdır, gerçek çalışmaya göre taşınmaz. Yeni `SessionInterval` tablosu her başlangıç/devam/faz/duraklatma/tamamlama için sunucuda `study`, `break`, `pause` aralıkları tutar. Aynı seansta tek açık aralık partial unique index ile korunur. Aralık kapanışı ve session güncellemesi aynı IMMEDIATE transaction içindedir; enjekte SQL sonrası hatada ikisi birlikte rollback olur. İstemci süre değeri yazamaz.

`trackingCoverage`: yeni seans `complete`; 004 öncesi seans `untracked`; bu eski seansta ölçüm başlarsa `partial`. Eski plan sürelerinden çalışma aralığı türetilmez. Eski kimlik/not/parola/plan/zaman/süre/durum kayıtları korunur. Tamamlandı işaretlenen ama hiç başlatılmamış yeni seansın ölçülen çalışması sıfırdır. Eski ölçülmemiş/kısmi kayıtlar özetlerde ayrıca belirtilir.

Reopen/reset/cancel önceki ölçülmüş aralıkları silmez. Yeniden başlatma yeni aralık ekler; önceki çalışma rapordan kaybolmaz. İptal edilmiş veya henüz tamamlanmamış seansın gerçekten ölçülmüş çalışması da toplama dahildir. Completed seans sayısı ayrı metriktir. Açık duraklama mola değil pause olarak ölçülür. Ayrı break seansı study toplamına girmez. GET açık aralığı sunucu `asOf` zamanına kadar hesaplar, DB'ye yazmaz. Kapanan aralıklar sabittir; duvar saati geri giderse son kaydedilmiş aralık sınırı korunur, negatif süre üretilmez.

Bu ölçüm aktif seansın sunucuda onaylanmış duvar saati aralığıdır; insanın ekrana baktığını ölçmez. Ağ kesilir veya tarayıcı kapanırsa sunucuya ulaşmayan pause/complete geriye dönük uydurulmaz. A15 altında deadline, reload, sekme sahipliği ve kesinti politikası hâlâ gereklidir.

## Şema evrimi

Explicit `004-session-activity-intervals`: mevcut study_sessions tablosuna yalnız trackingCoverage (untracked default) eklenir, session_intervals oluşturulur. Yeni model create default'u complete'dir. Ön doğrulama yalnız bu bekleyen migration'ın bilinen kolonunu eksik kabul eder; diğer eksikler reddedilir. Migration transaction'lı/idempotent; aralık tablosu oluşturma hatasında eklenen kolon ve migration kaydı geri alınır. Startup sync/alter çalıştırmaz, pending migration'da API açılmaz.

Yeni tablonun session FK'si cascade'dir. Session silme/reset mevcut kapsamıyla çalışır; yeni tablo o kapsamın dışına kaçmaz. Snapshot doğrulaması yeni migration/kolonları da ister. 003 veya daha eski snapshot'lar korunur fakat güncel restore tarafından reddedilir; uyumlu sürüm veya ayrı kopyada kontrollü migration gerekir.

## HTTP ve raporlama

Seans DTO'su `studySeconds/breakSeconds/pauseSeconds`, trackingCoverage, activityIntervals ve asOf içerir. Kaydedilen aralıklar milisaniye hassasiyetindedir; toplamlar saniye cinsindedir. `activityKind: study|break`, yalnız in_progress hedefinde kullanılabilir. Faz değişimi session status aynı kalsa da optimistic sürümü ilerletir. Dedicated break türü çalışma olarak kaydedilemez. Geçiş tablosu ve expectedUpdatedAt korunur.

`GET /study-sessions/stats`: mevcut kullanıcı kapsamında measured toplamlar ve isteğe bağlı tarih aralığında günlük kırılım. Tarih aralığında iki uç birlikte ve en fazla 366 gün; all-time sorguda gün listesi yoktur. Süre gerçek aralığın ilgili günle kesişimidir, plan başlangıcına veya tamamlanma gününe toptan yazılmaz. Tek read transaction ve tek mantıksal asOf kullanılır. Yetkili `/users/:id/stats` self/admin sınırıyla aynı hesabı kullanır. Admin kullanıcı listesinin her kullanıcı için adminin kendi session'ını sorgulayan eski yolu kaldırıldı; global admin dashboard toplamları A17 altında ayrıca açıktır.

Dashboard, haftalık grafik, plan stats, son aktiviteler/bildirim süreleri ve kullanıcı yönetimi measured süreyi kullanır. Planner kart/form süreleri plan değeridir. Hata sıfır veri gibi gösterilmez; ölçülmemiş tarihsel kayıt measured toplama eklenmez. Plan hedef oranı gerçek study toplamından hesaplanır; bitmemiş planların duration toplamı çalışma sayılmaz.

## Saat dilimi ve takvim

Luxon 3.7.2 ve tipleri seçildi; runtime ile Intl/IANA verisini kullanır. [Resmî API](https://moment.github.io/luxon/api-docs/index.html), startOf/plus ve getPossibleOffsets davranışları incelendi. Temporal polyfill araştırıldı ancak projeye eklenmedi. packages/contracts/time.ts tek gün/saat sözleşmesidir; timezone şeması tercihler ve query için ortaktır.

API instant'ları offset/Z içeren ISO'dur. Takvim sorgu günleri strict yyyy-MM-dd; kullanıcı tercihi timezone veya açık query timezone ile [gün başı, sonraki gün başı) UTC aralığına çevrilir. Backend process TZ kullanılmaz. Listeleme plan aralığıyla kesişimi alır; geceyi kesen seans ikinci gün de görünür. Gün sınırları 24 saat ekleyerek üretilmez; 23/25 saatlik DST günleri testlidir.

Form wall time → instant dönüşümü seçilmiş timezone'dadır. Eksik veya çift yaşanan saatler sessizce başka saate taşınmaz; açık form hatası verilir. Mevcut açık offset'li instant'lar okunabilir; grid tekrarlanan saatin iki kopyası için ayrı saat satırı üretmez. DST günü iki örtüşen wall-clock kartı ve tam pointer/klavye akışı A22 kapsamında ayrıca tarayıcıyla değerlendirilmelidir.

`CalendarDate` yalnız takvim alanlarını taşıyan sentetik UTC Date adaptörüdür; gerçek instant değildir. frontend/utils/calendarDates.ts gün/hafta/ay hesabını bu alanlar üzerinde yapar; tarayıcının kendi DST'si seçilen timezone'u bozamaz. **CalendarDate.toISOString() API'ye yazılmaz**; calendarViewInstant veya wallTimeToInstant ile gerçek UTC instant'a çevrilir. Süre hesabı gerçek instant'lar üzerindedir. Günlük/haftalık görünümler ve tarih taşıma dialog'u bu adaptörleri kullanır; geceyi kesen kart her günün görünür sınırına kırpılır. Timezone değişimi takvim state'ini yeniden kurar; UI seçili timezone'u gösterir.

## Doğrulama ve açık sınırlar

Temiz npm ci ve npm run check başarılı: **8 contracts + 78 backend + 39 frontend = 125 test**, atlanan yok; strict typecheck, sıfır uyarılı lint, naming ve iki production build. Audit 12 paket düğümü (5 high/7 moderate) açık kalır. Loglar /tmp/study-tracker-tracking-install.log ve /tmp/study-tracker-tracking-check.log içinde. Yeni regresyonlar: 5+3+5 dakika, mola/faz, untracked migration ve rollback, no-op/GET, yeniden açma/iptalde geçmiş, kullanıcı/plan kapsamı, yerel gece yarısı, strict gün filtreleri, 23/25 saat ve belirsiz saat, UTC/İstanbul/New York process TZ eşitliği, sentetik takvim günü ve geceyi kesen kart kırpması, Pomodoro otomatik fazının tek HTTP yazması. DB testleri yalnız atılabilir SQLite kullanır.

İki timer hâlâ tick ile ilerler; bu paket A15'i kapatmaz. Deadline/faz kalıcılığı, çoklu sekme sahipliği, mobil/touch/WCAG/E2E, global admin agregasyonları, diğer catalog transaction'ları ve kalan yönetim ayarları açıktır. Stats şu an kullanıcının seans/aralıklarını tek sorguda belleğe alıp hesaplar; ölçülmüş yük/kapasite iddiası yoktur. Büyük veri için sorgu planı ve sunucu agregasyonu ayrıca değerlendirilmelidir.

Production bundle ayrı 127.0.0.1:3001 / 5003 ve atılabilir fixture'da test edildi. Dashboard 60 dakikalık plandan yalnız 10 dakika ölçümü, eski başka 60 dakikalık plandan “Süre ölçülmedi” ayrımını gösterdi. Formda 18:30 İstanbul seçimi DB'de 15:30 UTC, takvimde 18:30 olarak doğrulandı. Gerçek 1 dakikalık Pomodoro sonunda pause, mola start'ında break ve complete ile kapanış DB'de study → pause → break olarak kontrol edildi; measured toplam 11 dakikaya çıktı, mola/plan süreleri eklenmedi. Kanıt repo dışındaki aynı Codex artifact dizininde study-time-measured.png. Test hesabından çıkıldı, sekme/sunucu/DB temizlendi. Tam otomatik tarayıcı E2E değildir.

Gerçek yerel yükseltme normal operasyon olarak yapıldı: dev süreçleri kapatıldı; private native snapshot + checksum/integrity/FK; explicit 004 migration; eski tüm tablo satırlarının (study_sessions yeni coverage kolonu hariç) snapshot ile birebir karşılaştırılması; yeni aralık sayısı sıfır; güncel schema manuel yedeği id 4. .local/tracking-upgrade-2026-10-16.json pointer ve snapshot 0600/Git dışındadır. Reset/restore/seed yok. Tek root dev süreci localhost:3000/API 5002 ile yeniden başlatıldı, health/frontend 200. Commit/push/deployment yapılmadı.
