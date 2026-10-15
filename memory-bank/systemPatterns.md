# Ders Takip Sistemi — Sistem Örüntüleri

Kaynak kodla doğrulama: 15 Ekim 2026, ilk uygulama paketi. Bu belge mevcut davranışla hedef standardı ayrı tutar. Güncel uygulama kaydı implementation/2026-10-15-foundation.md içindedir.

## Mevcut mimari

```text
React SPA
  ├─ Router → sayfa / planner / modal bileşenleri
  ├─ TanStack Query → services/api.ts → Axios
  └─ Zustand → auth, global ayar, kişisel tercih + localStorage
                         │ HTTP JSON / Bearer JWT
app.ts middleware → routes → controllers → Sequelize → SQLite
  └─ policies/courseAccess.ts → owner/global/admin scope
index.ts → env/schema kontrolü → listen/cron/kapanış
                         │
                         └─ Backup controller / açılış cron'u → dosya sistemi
```

Controller'lar HTTP, yetki ve iş kurallarını ORM sorgularıyla birlikte yürütür. Ortak course erişim politikası ayrıldı; diğer iş kuralları henüz ayrı service/repository katmanına taşınmadı. Bu basit modüler tek uygulama ölçeğinde çalışmaya devam edilebilir; mevcut problemlerin çözümü mikroservis gerektirmiyor.

## Veri sınırları

- User → Plan, StudySession; kullanıcı silinince bu kayıtlar cascade.
- User → Course; kullanıcı silinince course.userId SET NULL.
- Category → Course; kategori silme RESTRICT.
- Course → Topic; ders silmede ilişki CASCADE; konu controller'ı normal konu silmede isActive=false uygular.
- Plan/Course/Topic → StudySession; ilişkiler silinince ilgili FK SET NULL.
- Category global; Course kişisel veya global; Topic üst Course erişimini miras almalı.
- Settings global key/value; kişisel tercih User.preferences JSON alanıdır.
- Backup metadata'sı aktif DB içinde; snapshot dosyasıyla katalog yaşam döngüsü güvence altında değil.

İndeksler ve model validation'ları mevcut. Açık baseline migration ve schema_migrations kaydı eklendi; seed transaction kullanır. Oturum/silme/reset iş kurallarında transaction standardı henüz yok.

## Mevcut auth ve veri akışı

1. Login/register JSON response içinde user ve access/refresh JWT döndürür.
2. authStore ikisini localStorage'a persist eder; Axios her istekte buradan access okur.
3. protect token'ı doğrulayıp aktif User kaydını DB'den getirir; authorize DB rolünü kullanır.
4. 401 interceptor refresh endpoint'ini çağırır ve localStorage'ı değiştirir; store belleğini eşitlemez.
5. Auth kimliği değişince QueryClient cache ve eski sorgular temizlenir.
6. Logout backend'de token iptal etmez. Refresh tekrar kullanımını engelleyen kalıcı oturum kaydı yok.
7. Token anahtarları merkezi env şemasıyla zorunlu doğrulanır; sabit fallback yok.

HttpOnly cookie, güvenli token rotasyonu ve merkezi session revocation önceki belgelerde hedefle gerçek karıştığı için uygulanmış gibi anlatılmıştı; mevcut durumda yoktur.

## Mevcut state ve sorgu örüntüsü

Sunucu verisi çoğunlukla Query'de; auth/ayarlar Zustand'da. Query key ve invalidation'lar bileşenlere dağılmış. Kullanıcıya özel key'lerde kullanıcı kimliği henüz yok; hesap değişiminde cache temizliği ve geç sorgu izolasyonu eklendi. Bazı günlük key'ler tarih içermiyor. Ortak query key factory uygulanmamış.

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
- Form Zod 3, backend Zod 4/Joi, model JSON ve frontend Preferences ortak şemadan türemiyor.
- Refresh iptali, güvenilir snapshot/restore ve transaction'lı reset/silme eksik.
- Tarih/timezone/query key/invalidation ve kişisel tercih saklama sınırları tamamlanmadı.

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

### Veritabanı ve kurtarma — migration temeli uygulandı

Açılışta şema onarma/silme yerine açık migration. Tek DB yolu. Tutarlı snapshot, checksum/integrity kontrolü, atomik restore, rollback ve doğrulanmış yeniden açılış. Çok adımlı reset/silme/sıralama transaction içinde olmalı. Backup işi son başarılı zaman ve açık timezone üzerinden planlanmalı.

### Kalite ve gözlemlenebilirlik — yerel kontrol zinciri uygulandı

Strict'i koruyan build, desteklenen lint, kritik davranış regresyonları ve CI zorunlu hedef. Test önceliği yetki matrisi, oturum aralığı/durum/süre, tercih round-trip, hesap değiştirme cache izolasyonu ve restore. Loglar hassas alanları maskelemeli; beklenen DB doğrulama hataları 4xx, beklenmeyenler güvenli 5xx olmalı. Route splitting, ErrorBoundary, mobil/klavye ve performans bütçeleri ölçümle tamamlanmalı.

Kalıcı süreç için `workingPrinciples.md`; uygulanacak sıra için `activeContext.md`/`progress.md`; ayrıntılı gerekçeler için `audits/2026-10-15-project-audit.md` esas alınır.

## Güncel görsel örüntüler — 15 Ekim 2026

`design-system.md` kaynak standarttır. CSS değişkenleri açık/koyu yüzey ve metin anlamını taşır; PageHeader ile ana sayfa hiyerarşisi, panel/btn/nav/segmented-control sınıfları ortaklaştırılır. İş verisinin rengi nötr metinden ayrılır. Eski pastel/cam/gradyan görünüm ikinci alternatif olarak tutulmaz. Mobil menü tek Dialog ile overlay/odak/Escape yönetir; Layout'ta ikinci overlay yoktur. Takvimlerde ortak initializeCalendarViewport kullanılır; iş kuralı motorları hâlâ ayrıdır.

Dashboard ve CoursesPage aynı key için aynı ham API response biçimini cache'ler; dashboard select kullanır. Son aktiviteler/bildirimler getRecentSessions ile completion/end zamanında sıralanır; shared query dizisi yerinde mutate edilmez. Tasarım dönüşümü açık auth/backup/timer/süre/Preferences sorunlarını çözmüş sayılmaz.
