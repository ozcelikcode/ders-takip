# Ders Takip Sistemi — Sistem Örüntüleri

Kaynak kodla doğrulama: 16 Ekim 2026, tercihler ve site kimliği paketi. Bu belge mevcut davranışla hedef standardı ayrı tutar. Güncel uygulama kaydı implementation/2026-10-16-preferences-and-site-identity.md içindedir; foundation kaydı tarihseldir.

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

Controller'lar HTTP, yetki ve iş kurallarını ORM sorgularıyla birlikte yürütür. Ortak course erişim politikası, auth session/admin kurtarma ve backup/bakım servisleri ayrıldı; planner/catalog kuralları henüz aynı service sınırına taşınmadı. Bu basit modüler tek uygulama ölçeğinde çalışmaya devam edilebilir; mevcut problemlerin çözümü mikroservis gerektirmiyor.

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

İndeksler ve model validation'ları mevcut. Açık baseline migration ve schema_migrations kaydı eklendi; seed transaction kullanır. Auth rotasyonu/parola/admin kurtarma ve reset transaction içindedir; StudySession çakışma ve diğer çok adımlı silmelerde bütünlük işleri sürer.

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

- Session create çakışması atomik değil; update çakışma kontrolü yapmıyor.
- Start/pause/complete ile genel PUT farklı durum kuralları yürütüyor.
- Plan süresi gerçek çalışma gibi toplanıyor; pause/resume aktif süre kaydı yok.
- Günlük/haftalık planner ve iki Pomodoro motoru benzer kuralları tekrar ediyor.
- Preferences/site settings ortak contracts Zod 4 şeması/tiplerinden gelir; diğer form/API sözleşmelerinde Zod 3/Joi/manual ayrışması sürer.
- Diğer çok adımlı ders/kategori/konu silme/sıralama işlemleri transaction standardına taşınmadı; auth ve reset kapsamı tamamlandı.
- Backend timezone aralıkları ve gerçek süre hâlâ açık. Query/cache ve kişisel tercih saklama sınırları 16 Ekim paketinde uygulandı.

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

Reset safety backup + IMMEDIATE transaction içindedir; settings_only yalnız ayarlar, all öğrenci/ders/çalışma verisi (adminler korunur). Diğer silme/sıralamalar açık. Cron her 5 dakikada ayarı yeniden okuyup son başarılı otomatik manifestten geçen 1/5/7 tam güne bakar. Otomatik silme yok. Koordinasyon tek backend içindir; dış yazıcılar, offsite/kapasite/retention ve gerçek ortam kurtarma tatbikatı ayrıca gereklidir.

### Kalite ve gözlemlenebilirlik — yerel kontrol zinciri uygulandı

Strict'i koruyan build, desteklenen lint, kritik davranış regresyonları ve CI zorunlu hedef. Test önceliği yetki matrisi, oturum aralığı/durum/süre, tercih round-trip, hesap değiştirme cache izolasyonu ve restore. Loglar hassas alanları maskelemeli; beklenen DB doğrulama hataları 4xx, beklenmeyenler güvenli 5xx olmalı. Route splitting, ErrorBoundary, mobil/klavye ve performans bütçeleri ölçümle tamamlanmalı.

Kalıcı süreç için `workingPrinciples.md`; uygulanacak sıra için `activeContext.md`/`progress.md`; ayrıntılı gerekçeler için `audits/2026-10-15-project-audit.md` esas alınır.

## Güncel görsel örüntüler — 15 Ekim 2026

`design-system.md` kaynak standarttır. CSS değişkenleri açık/koyu yüzey ve metin anlamını taşır; PageHeader ile ana sayfa hiyerarşisi, panel/btn/nav/segmented-control sınıfları ortaklaştırılır. İş verisinin rengi nötr metinden ayrılır. Eski pastel/cam/gradyan görünüm ikinci alternatif olarak tutulmaz. Mobil menü tek Dialog ile overlay/odak/Escape yönetir; Layout'ta ikinci overlay yoktur. Takvimlerde ortak initializeCalendarViewport kullanılır; iş kuralı motorları hâlâ ayrıdır.

Dashboard ve CoursesPage aynı key için aynı ham API response biçimini cache'ler; dashboard select kullanır. Son aktiviteler/bildirimler getRecentSessions ile completion/end zamanında sıralanır; shared query dizisi yerinde mutate edilmez. Tasarım dönüşümü tek başına auth/backup sorunlarını kapatmamıştı; bunlar sonraki güvenlik/kurtarma paketinde ayrı doğrulandı. Tercih sözleşmesi 16 Ekim paketinde kapatıldı; timer/süre hâlâ açıktır.

## Preferences ve site kimliği — 16 Ekim

contracts v1 ortak runtime şeması/tipler; 003 explicit JSON dönüşümü ve kayıpsız kaynak arşivi. User/admin tercih patch'i güncel satırdan IMMEDIATE transaction içinde birleşir. İstemci sıraya alınmış, sunucu onaylı kayıt yapar; generation hesap değişiminde bekleyen/geç sonucu iptal eder. Profil ve private admin response'ları da kimlik sınırına tabidir. Profil/tercih HTTP yazmaları ortak kuyruktadır; monoton tercih revision'ı geç eski refresh/profil snapshot'ının aynı hesapta yeni onaylanan tercihi ezmesini engeller. Aynı alanda son yazma kazanır; cihazlar arası canlı conflict-resolution kurulmadı.

Kişisel tercih belleği login/refresh profilinden doğar; anonim/başka hesaba geçince temizlenir. Sahipsiz eski browser değerleri manuel kurtarma arşivine alınır, aktif fallback yapılmaz. Bildirim id'leri account anahtarıyla ve boyut sınırıyla saklanır. Tema/renk tek appearance katmanı ve OS listener ile uygulanır; özel renk kaldırılınca public site rengi döner.

Public branding DTO → site-branding cache → Brand/login/register/sidebar/loading/title/meta/favicon. Admin config yalnız yetkili ayrı API/bellek; transaction'lı şema doğrulaması. SiteName görünür markadır, repo adı veya domain değildir. Gerçek isim kullanıcı tarafından admin'den seçilir; fixture adı normal kuruluma taşınmaz.
