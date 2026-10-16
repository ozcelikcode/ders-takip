# Ders Takip Sistemi — Sistem Örüntüleri

Kaynak kodla doğrulama: 16 Ekim 2026, katalog düzenleme ve ortak planlayıcı paketleri. Bu belge mevcut davranışla hedef standardı ayrı tutar. Güncel uygulama kayıtları implementation/2026-10-16-catalog-editing.md ve implementation/2026-10-16-shared-planner.md içindedir; foundation kaydı tarihseldir.

## Mevcut mimari

```text
React SPA
  ├─ Router → sayfa / planner / modal bileşenleri
  ├─ TanStack Query → services/api.ts → Axios
  └─ Zustand → bellek auth; global ayar/kişisel tercih kalıcılığı ayrı
                         │ HTTP JSON / bellek Bearer JWT + HttpOnly refresh cookie
app.ts middleware → routes → controllers → Sequelize → SQLite
  └─ policies/courseAccess.ts → owner/global/admin scope
index.ts → env/schema kontrolü → listen/cron/kapanış
                         │
                         └─ Backup service / periyodik due kontrolü → native SQLite snapshot + manifest
```

Okuma controller'ları ORM sorgularını yürütür; yazma iş kuralları ilgili servislerde toplanır. Ortak course erişim politikası, auth session/admin kurtarma ve backup/bakım servisleri ayrıldı; StudySession HTTP yazmaları ortak service sınırına taşındı; catalog HTTP yazmaları da services/catalog.ts sınırına taşındı. Bu basit modüler tek uygulama ölçeğinde çalışmaya devam edilebilir; mevcut problemlerin çözümü mikroservis gerektirmiyor.

## Veri sınırları

- User → Plan, StudySession; kullanıcı silinince bu kayıtlar cascade.
- User → Course; kullanıcı silinince course.userId SET NULL.
- Category → Course; kategori silme RESTRICT.
- Course → Topic; ders silmede ilişki CASCADE; konu controller'ı normal konu silmede isActive=false uygular.
- Plan/Course/Topic → StudySession; ilişkiler silinince ilgili FK SET NULL.
- Category global; Course kişisel veya global; Topic üst Course erişimini miras almalı.
- Settings global key/value; kişisel tercih User.preferences JSON alanıdır.
- User → AuthSession → RefreshCredential cascade; refresh hash geçmişi aile ömrü boyunca tutulur.
- Backup metadata'sı DB içinde, doğrulama manifesti snapshot yanında; katalog başlangıç/restore sonrası manifestlerden yeniden kurulur.

İndeksler ve model validation'ları mevcut. Açık baseline migration ve schema_migrations kaydı eklendi; seed transaction kullanır. Auth rotasyonu/parola/admin kurtarma ve reset transaction içindedir; StudySession yazmaları IMMEDIATE transaction içindedir; catalog yazmaları da IMMEDIATE transaction içindedir.

## Mevcut auth ve veri akışı

1. Login/register user + kısa access JWT döndürür; refresh credential yalnız HttpOnly/SameSite Strict cookie'ye yazılır. Access bellek dışına persist edilmez.
2. protect açık algoritma/issuer/audience doğrulamasından sonra session id/kullanıcı/aktiflik/son süre/iptal kontrolü yapar; authorize güncel DB rolünü kullanır.
3. Refresh IMMEDIATE transaction içinde credential tüketimi ve yenisini üretir. Önceden tüketilmiş hash tekrar kullanılırsa bütün aile iptal edilir. Mutlak session süresi uzamaz.
4. Axios paralel/geç 401'leri tek refresh ile çözer; epoch ve aynı-kullanıcı kontrolü geç yanıtın bitmiş/değişmiş kimliği geri getirmesini engeller. Web Locks cookie operasyonlarını sekmeler arasında sıraya koyar, BroadcastChannel peers cache/kimliğini temizler.
5. Logout önce yerel kimliği/cache'i siler, geç refresh'i bekler ve sunucu session'ını iptal eder. Ağ hatasında gizli bilgi içermeyen pending intent, reload ile otomatik giriş yapılmasını engeller.
6. Parola değişimi ve admin kurtarma bütün kullanıcı session'larını; rol/aktiflik değişimi ilgili eski session'ları iptal eder. Hash doğrulama/yazma yarışları transaction içinde denetlenir.
7. Auth route'larında özel başlık/Origin/Sec-Fetch-Site kontrolü, credentials cookie transport, no-store ve production Secure/HTTPS uygulanır. Eski JWT_REFRESH_* ve JSON refresh sözleşmesi kaldırılmıştır; migration ve yeniden giriş gerekir.

## Mevcut state ve sorgu örüntüsü

Sunucu verisi çoğunlukla Query'de; auth/ayarlar Zustand'da. Query key ve invalidation'lar bileşenlere dağılmış. Bütün kaynaklar account key factory altında, session'lar timezone ve ilgili tarihi taşır. Güncel gün anahtarı 30 saniye/focus ile değişir; haftalık özet yeniden türetilir. Hesap değişiminde cache/sorgu temizliği, geç yanıt izolasyonu ve Layout yeniden kurulumu var. Session/catalog yazmaları ilgili bütün görünüm key'lerini ortak prefix ile yeniler.

Query key'i sorgu sonucunu belirleyen kimlik/filtrelere bağlamak gerekir. Invalidation prefix ile yapılabilir; her invalidation'ın bütün parametreleri birebir içermesi zorunlu değildir. Önceki bankadaki ters ifade geçersizdir.

## Düzeltilen örüntüler

- Ders/konu görünürlüğü ortak owner/global/admin politikasına bağlı; kullanıcı detayında self/admin sınırı var.
- Yeni oturumun course/topic ilişkileri görünürlük, aktiflik ve eşleşme açısından doğrulanıyor.
- GET session artık not/durum değiştirmiyor.
- app importu side-effect olarak sunucu/cron başlatmıyor; index başlangıç/kapanış sorumluluğunda.
- Schema değişikliği açılışta yapılmıyor; explicit baseline migration var, otomatik tablo silme kaldırıldı. Backup aynı DB yolu kaynağına bağlı.
- Route lazy loading, kök ErrorBoundary, çalışır lint/typecheck/test/build ve CI workflow var.
- Error handler mevcut Sequelize hatalarını sınıflandırıyor; iç hata mesajını kullanıcıya açmıyor.

## Hâlâ açık iş kuralı sorunları

- Günlük/haftalık planner tek ortak renderer/işlem hook/kart/geometry kullanır. İki Pomodoro motoru A15 ile tek ortak hook/UI ve sunucu faz makinesine taşındı. A21 öğrenci katalog UI tamamdır; kalan kategori/kullanıcı/ayar ve diğer tasarım yüzeyleri açıktır.
- Preferences/site settings ortak contracts Zod 4 şeması/tiplerinden gelir; diğer form/API sözleşmelerinde Zod 3/Joi/manual ayrışması sürer.
- Katalog transaction kapsamı tamamlandı; genel metadata yazmaları last-writer-wins, reorder bütün aktif liste/sürüm snapshot’ını denetler. Kullanıcı-konu ilerlemesi artık kullanıcıya özel user_topic_progress tablosundadır (A24).

Bulguların güncel durumları progress.md içinde, tarihsel kaynakları A01–A22 audit raporunda kayıtlıdır.

## Hedef örüntüler — uygulanan ilk kapsam alt başlıklarda belirtilir

### Yetkiyi sorgu sınırına taşıma — ilk kapsam uygulandı

Ders okuması sahibi/global/admin politikasından, konu okuması dersin görünürlüğünden türemeli. Kimlik doğrulama erişim yetkisi yerine geçmez. İlişkili course/topic/plan seçimleri aynı politikayla doğrulanmalı. Kullanıcıya özel tüm liste/detay/aggregate yollarında tutarlı scope kullanılmalı.

### İşlem bazında service sınırı

HTTP/controller yalnız doğrulanmış giriş, actor ve response çevirisini yönetmeli. Kullanım senaryosu service'i yetki, durum geçişi ve transaction'ı tek yerde uygulamalı. Auth, catalog, planning/study-tracking, settings ve backup ihtiyaçlarına göre sınırlar oluşturulmalı. İhtiyaç dışı generic abstraction eklenmemeli.

### Tek sözleşme

Request/response ve Preferences için ortak şema/DTO; zaman ISO UTC, entity ID tipi, optional/null, hata kodu ve pagination anlamı açık olmalı. Aynı sözleşmeden frontend tipleri ve API dokümanı türetilebilir. Model persistence ayrıntısı dış API sözleşmesi yerine kullanılmamalı.

### Durum ve zaman bütünlüğü

Plan zamanı ile gerçekleşen çalışma aralıkları ayrılmalı. Durum geçiş tablosu bütün yazma yollarında aynı olmalı. Create/move çakışması atomik; tekrar denemeler idempotent; eski istemci yazmaları algılanabilir olmalı. Gün aralıkları kullanıcı timezone'unda, UTC [başlangıç,bitiş) aralıklarına çevrilmeli. GET salt okuma yapmalı.

### Tek frontend davranış motoru

Planner için mutation/drag/resize kuralları ortak katmanda, günlük/haftalık render ayrı. Timer deadline/birikmiş süre ve tek faz makinesiyle çalışmalı. Query key factory kullanıcı/tarih/filtre kapsamını taşımalı. Auth değişiminde cache, devam eden istekler ve kişisel kalıcılık sınırı kapatılmalı.

### Veritabanı ve kurtarma — tek süreç kapsamı uygulandı

Açılışta şema onarma/silme yerine açık migration; tek DB yolu. Native Online Backup API ile tutarlı WAL snapshot ve atomik destination restore; dış manifest/SHA-256/integrity/FK/şema doğrulaması. Restore öncesi safety backup, son kontrol hatasında rollback; kurtarma da başarısızsa API bakımda kalır. HTTP bakım kapısı aktif yanıtları boşaltır, yeni istekler Retry-After/503 alır. Restore eski session'ları iptal eder.

Reset safety backup + IMMEDIATE transaction içindedir; settings_only yalnız ayarlar, all öğrenci/ders/çalışma verisi (adminler korunur). Katalog silme/sıralamalar da ortak IMMEDIATE servise taşındı. Cron her 5 dakikada ayarı yeniden okuyup son başarılı otomatik manifestten geçen 1/5/7 tam güne bakar. Otomatik silme yok. Koordinasyon tek backend içindir; dış yazıcılar, offsite/kapasite/retention ve gerçek ortam kurtarma tatbikatı ayrıca gereklidir.

### Kalite ve gözlemlenebilirlik — yerel kontrol zinciri uygulandı

Strict'i koruyan build, desteklenen lint, kritik davranış regresyonları ve CI zorunlu hedef. Test önceliği yetki matrisi, oturum aralığı/durum/süre, tercih round-trip, hesap değiştirme cache izolasyonu ve restore. Loglar hassas alanları maskelemeli; beklenen DB doğrulama hataları 4xx, beklenmeyenler güvenli 5xx olmalı. Route splitting, ErrorBoundary, mobil/klavye ve performans bütçeleri ölçümle tamamlanmalı.

Kalıcı süreç için `workingPrinciples.md`; uygulanacak sıra için `activeContext.md`/`progress.md`; ayrıntılı gerekçeler için `audits/2026-10-15-project-audit.md` esas alınır.

## Güncel görsel örüntüler — 15 Ekim 2026

`design-system.md` kaynak standarttır. CSS değişkenleri açık/koyu yüzey ve metin anlamını taşır; PageHeader ile ana sayfa hiyerarşisi, panel/btn/nav/segmented-control sınıfları ortaklaştırılır. İş verisinin rengi nötr metinden ayrılır. Eski pastel/cam/gradyan görünüm ikinci alternatif olarak tutulmaz. Mobil menü tek Dialog ile overlay/odak/Escape yönetir; Layout'ta ikinci overlay yoktur. Takvimlerde ortak initializeCalendarViewport ve son A21 paketiyle tek ortak işlem/görünüm motoru kullanılır.

Dashboard ve CoursesPage aynı key için aynı ham API response biçimini cache'ler; dashboard select kullanır. Son aktiviteler/bildirimler getRecentSessions ile completion/end zamanında sıralanır; shared query dizisi yerinde mutate edilmez. Tasarım dönüşümü tek başına auth/backup sorunlarını kapatmamıştı; bunlar sonraki güvenlik/kurtarma paketinde ayrı doğrulandı. Tercih sözleşmesi ve ölçülen süre sonraki 16 Ekim paketlerinde tamamlandı; timer deadline motoru sonraki A15 paketiyle tamamlandı.

## Preferences ve site kimliği — 16 Ekim

contracts v1 ortak runtime şeması/tipler; 003 explicit JSON dönüşümü ve kayıpsız kaynak arşivi. User/admin tercih patch'i güncel satırdan IMMEDIATE transaction içinde birleşir. İstemci sıraya alınmış, sunucu onaylı kayıt yapar; generation hesap değişiminde bekleyen/geç sonucu iptal eder. Profil ve private admin response'ları da kimlik sınırına tabidir. Profil/tercih HTTP yazmaları ortak kuyruktadır; monoton tercih revision'ı geç eski refresh/profil snapshot'ının aynı hesapta yeni onaylanan tercihi ezmesini engeller. Aynı alanda son yazma kazanır; cihazlar arası canlı conflict-resolution kurulmadı.

Kişisel tercih belleği login/refresh profilinden doğar; anonim/başka hesaba geçince temizlenir. Sahipsiz eski browser değerleri manuel kurtarma arşivine alınır, aktif fallback yapılmaz. Bildirim id'leri account anahtarıyla ve boyut sınırıyla saklanır. Tema/renk tek appearance katmanı ve OS listener ile uygulanır; özel renk kaldırılınca public site rengi döner.

Public branding DTO → site-branding cache → Brand/login/register/sidebar/loading/title/meta/favicon. Admin config yalnız yetkili ayrı API/bellek; transaction'lı şema doğrulaması. SiteName görünür markadır, repo adı veya domain değildir. Gerçek isim kullanıcı tarafından admin'den seçilir; fixture adı normal kuruluma taşınmaz.

## Seans yazma politikası — 16 Ekim

services/studySessions.ts bütün create/update/action/delete HTTP yollarının transaction/yetki/durum/aralık sınırıdır. SQLite IMMEDIATE check+write'ı serileştirir. [start,end) örtüşmesi kullanıcı kapsamında, current id dışlanarak denetlenir; cancelled hariç bütün durumlar takvim aralığını korur. İptalden yeniden etkinleştirme de kontrol edilir. Tek in_progress seans, terminal durumdan planned ile yeniden açma, değişmeyen tamamlamada no-op/completedAt koruması ve yeniden açmada completedAt=null vardır. Bekleyen süre aşımında GET yazmaz, pause hata verip gizlice durum değiştirmez.

Bütün edit/action/delete yolları expectedUpdatedAt ister; eski sürüm 409'dur. beforeUpdate önceki timestamp'ten en az +1 ms üretir. İstemci gördüğü snapshot'ı taşır, mutation yanıtını saklar; 409 sonrası session query prefix yenilenir ve otomatik mutation retry yapılmaz. Bu bir HTTP service sözleşmesidir; harici SQL/bulk FK yazmaları aynı alan politikasına dahil değildir. Yeni şema/migration eklenmedi. Ortak Zod seans şeması/SessionStatus/geçiş tablosu contracts içindedir; diğer DTO borcu devam eder. Süre/timezone ve tek motor açık kalır. Kanıt ve geçiş tablosu: implementation/2026-10-16-session-integrity.md.

## Ölçüm ve takvim — 16 Ekim

StudySession → SessionInterval cascade; tek açık aralık partial unique index. Session geçişi ve study/break/pause sınırı aynı IMMEDIATE transaction içindedir. duration/start/end plan sözleşmesidir; measured saniye ayrı aralıklardan türetilir. Reopen/cancel ölçülen geçmişi silmez. trackingCoverage complete/partial/untracked 004 ile tanımlanır; eski sürelerden ölçüm çıkarılmaz. GET DB'ye yazmaz, aralıkları tek asOf ile hesaplar.

Kullanıcı/plan stats ve kullanıcı yönetim satırları ortak getStudyStats kapsamını kullanır. Self/admin endpoint'i yabancı öğrenciyi 404 ile sınırlar. Gerçek aralıklar yerel gün UTC sınırına kesişimle bölünür; saat dilimi sunucudan değil kullanıcı/query'den gelir. stats query aralığı 366 günle sınırlı, all-time gün listesi yoktur. Büyük veri/yük ölçümü yapılmadı; tek sorguyla seans/aralıklar belleğe alınır.

contracts/time.ts Luxon/IANA + timezone/gün şemasını sağlar. CalendarDate yalnız sentetik UTC takvim alanıdır; API payload için calendarViewInstant/wallTimeToInstant zorunlu. Browser kendi DST'si takvim alanlarını değiştirmez. Takvim/form taşıma ve geceyi kesen kart kırpması bu yoldan gider. Eksik/çift yerel saat formda reddedilir; grid iki fold için ayrı satır üretmez. Bu tarihsel pakette A15 açıktı; sonraki kalıcı Pomodoro paketi faz sınırını sunucuya taşıdı. Ayrıntı: implementation/2026-10-16-study-time-and-timezones.md.

## Katalog bütünlüğü — 16 Ekim

services/catalog.ts create/update/delete/reorder için yetki/check/write/response transaction sınırıdır. Category migration bütün kullanıcı/aktiflik derslerini taşır ve kaynak kategoriyi atomik siler. Course DELETE öncesi ilişkili session FK'leri instance save ile temizlenir; monotonic session sürümü ilerler, DB topic cascade uygular; interval/seans/not korunur. Topic DELETE isActive=false'dur. Reorder yalnız aktif konuların tam tekil 1..N permütasyonu ve id/updatedAt snapshot'ıyla; değişmiş listede 409. Topic beforeUpdate monotonic +1 ms sağlar. Arşiv sırası aktif sıralama kapsamı dışındadır; reactivation çakışması kontrollü sona eklenir. Shared catalog schema/tipleri contracts'tadır. Genel catalog metadata için optimistic conflict resolution kurulmadı. Ayrıntı: implementation/2026-10-16-catalog-integrity.md.

## Çalışma zamanı ayarları — 16 Ekim

Site ayarları services/siteSettings.ts üzerinden okunur. Bakım kapısı `protect` içindedir (admin hariç 503 + Retry-After); login/register ayrıca denetler, logout/refresh/public ayar okuma açıktır. Kayıt kapalıyken register 403. Boşta oturum süresi refresh döndürmede, son kimlik yaşı üzerinden hesaplanır ve erişim anahtarı ömründen kısa olamaz. Önyüz public DTO'dan bakım/kayıt ekranlarını türetir.

## Kullanıcı-konu ilerlemesi — 16 Ekim

User ↔ Topic arasında UserTopicProgress (PK userId+topicId, CASCADE). Satır yok = not_started; yalnız in_progress/completed saklanır. Yazma services/topicProgress.ts'te, ders görünürlük politikasıyla ve IMMEDIATE transaction'da; global katalog satırlarına kullanıcı durumu yazılmaz. Frontend sunucu onaylı yazar ve ilerleme query'sini yeniler.

## Sunucu sahipliğinde Pomodoro — 16 Ekim

StudySession → PomodoroClock bire bir/cascade; 005 yalnız yeni tablo ekler, eski faz tahmin edilmez. Kalıcı deadline otoritedir; interval callback yalnız uyanma tetikler. Faz geçişi ve activity sınırı persisted deadline anında tek IMMEDIATE transaction içindedir. GET salt okunur; worker gecikmesinde açık study/break deadline ile kesilir. Başlat/pause/reset/complete/configure ve genel planner eylemleri aynı sürümlü seans servisini kullanır. Canlı süre ayarı değişimi planned/reset gerektirir. Çalışma bitince seçilen mola duraklatılmış başlar; autoStartBreaks opt-in ise sınırda çalışır. Mola bitince sonraki çalışma her zaman paused olur.

usePomodoro aynı account/session query key altında page/modal gözlemini paylaşır; sunucu saati + wall/monotonic geçen süreyle display türetilir, tick sayılmaz. Fazı istemci yazmaz. Eski GET/sürüm ve hesap değişiminden sonra gelen ack uygulanmaz. Numeric API user ID ve string view ID tek query factory içinde normalize edilir; BroadcastChannel yalnız userId ve değişti bildirimi taşır. Bakım kapısı background işi de boşaltır; scheduler shutdown beklenir/startup catch-up yapılır. Çok süreç/yük/offline ürün kapsamı ayrıca doğrulanmalıdır.

## Ortak takvim işlem/görünüm sınırı — 16 Ekim

WeeklyPlanner/DailyCalendar yalnız mode adaptörleridir. PlannerCalendar tek grid, context/action, drag/pointer resize ve modal render kaynağı; usePlannerCalendar query/seans komutu ve sunucu onayı sınırı; CalendarSessionCard ortak kart; calendarGeometry saf snap/gerçek süre/taşıma/segment kurallarıdır. Satır yüksekliği görünüm parametresidir, iş kuralı değildir. Sunucu çakışma/tek aktif/durum/sürüm otoritesi kalır. Senkron busy ref çift yazmayı, epoch geç ack uygulanmasını engeller. 409 read/refetch yapar ve dialog snapshot'ını yeniler; kullanıcının hedef tarihi korunur ve yeni onayı gerekir. Async Confirm/Move dialog başarı bekler. Geceyi kesen seansın gerçek süresi korunur; ilk segment drag/son segment resize politikası vardır. Tam DST grid/roving focus/touch/WCAG/E2E kapsamı açık kalır.


## Katalog düzenleme sınırı — 16 Ekim

CourseEditorModal öğrenci/admin create/edit, TopicEditorModal konu create/edit için tektir. Ortak CatalogEditorDialog ve CatalogDeleteDialog kullanılır; eskileri kod tabanında tutulmaz. Yeni formlar Zod 4 contracts create şemalarıyla doğrulanır; edit yalnız değişen izinli alanları yollar. Form snapshot'ı background refetch ile sıfırlanmaz, metadata halen last-writer-wins'tir. Frontend canManageCourse ortak görünüm politikasıdır; services/catalog.ts nihai yetki/transaction sınırıdır.

useCatalogMutation busy ref/epoch/sunucu onayı kullanır; catalog, sessions ve topic-progress account prefix'lerini yeniler. Arşiv sorgusu yalnız istenince açılır; arşivde reorder/progress yazımı yoktur. Restore aktif ad çakışmasını ad değişmese de transaction içinde doğrular; 409 otomatik tekrar edilmez. Geri alınan konunun kullanıcı ilerlemesi mevcut DB kaydından okunur. Ders silme kalıcı katalog/progress cascade ve session/interval koruma politikasını, konu silme geri alınabilir arşiv politikasını açıkça gösterir.
