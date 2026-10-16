# Ders Takip Sistemi — Teknik Bağlam

Kaynak ve doğrulama: 16 Ekim 2026, ortak planlayıcı paketi. Başlangıç incelemesi tarihsel raporda tutulur; aşağıdaki mevcut durum onun yerini alır.

## Araç zinciri

- npm workspaces: `packages/contracts`, `backend` ve `frontend`; teknik paket adları study-tracker / @study-tracker/backend / @study-tracker/frontend.
- Node 24.21.0 (`.nvmrc`, `.node-version`); npm 11.19.0; engine-strict. Tek kök package-lock.json izlenir ve npm ci kullanılır.
- Vite 8.3.4 / React plugin 6.1.2; ESLint 10.12.0 flat config / typescript-eslint 8.71.2; Vitest 5.0.4; TypeScript 5.9.3'e sabit.
- Backend hâlâ Express 4 + Sequelize 6; sqlite3 6.0.1'e güncellendi. Jest/ts-jest/nodemon/ts-node kaldırıldı; dev/seed tsx 4.23.15 ile çalışır.
- Frontend React 18, Router 6, Zustand 4, Query 5, Axios 1, RHF 7, Zod 3, Tailwind 3, Headless UI 1, Framer Motion 10, Recharts 2. Bu kütüphanelerin tümü son major'a taşınmış değildir; uyumluluk ve güvenlik dönüşümü açık iştir.
- Backend doğrulama Joi 17 + Zod 4; Preferences ve site ayarlarında packages/contracts ortak Zod 4/tipleri kullanılır. Diğer API/form DTO dönüşümleri tamamlanmadı. express-validator/winston/fs-extra ve frontend tailwind-merge/devtools kullanılmadığı için kaldırıldı. Tailwind plugin'leri devDependencies altında.
- Native script izinleri kök allowScripts içinde sürüme bağlı: sqlite3 6.0.1 ve esbuild 0.28.2; optional fsevents script'i kapalı. Yeni sürümün izni açıkça değerlendirilir.

## Başlatma ve yapılandırma

- `src/app.ts` middleware/router/HTTP uygulamasını dışa aktarır; import sırasında listen veya cron başlamaz.
- `src/index.ts` env/DB/schema kontrolünden sonra sunucu/cron başlatır. SIGINT/SIGTERM için job durdurma, istek bitişini bekleme ve DB kapatma var.
- `src/config/environment.ts`: merkezi Zod şeması; NODE_ENV, PORT, en az 32 karakterli JWT_SECRET, en fazla 15 dakika access süresi, 1–30 gün SESSION_TTL_DAYS, 12–16 BCRYPT_SALT_ROUNDS, pozitif limitler ve DB_PATH/BACKUP_DIR. Production FRONTEND_URL için HTTPS zorunlu. Eski JWT_REFRESH_SECRET/JWT_REFRESH_EXPIRE kullanılmaz.
- Eksik/zayıf/örnek JWT anahtarında başlangıç durur; sabit anahtar fallback'i yok. Ortam değerleri hata mesajına kopyalanmaz.
- PORT varsayılan 5002; CORS FRONTEND_URL'den gelir. Production rate limiter varsayılan 100 istek / 15 dakika. Header ve URL deployment doğrulaması ayrıca gerekir.
- `npm run configure` yalnız mevcut değilse backend/.env oluşturur; rastgele imzalama anahtarı kullanır, dosya 0600 izinli olur, mevcut dosyayı değiştirmez. Kullanıcının ilk kurulum yetkisiyle yeni .env ve DB oluşturuldu; mevcut kurulum bulunmuyordu. Admin CLI ile admin@example.com oluşturuldu; özel parola .local/admin-password.txt içinde (0600/Git dışında), değerler belgelenmez.
- Frontend API varsayılanı `/api`; development proxy backend 5002'ye gider. Production reverse proxy dağıtım sorumluluğudur.

## Veritabanı yaşam döngüsü

- database.ts DB_PATH'i backend köküne göre çözer veya mutlak yolu kullanır; `:memory:` ayrı desteklenir. Backup aynı databasePath/backupDirectory kaynağını kullanır.
- connectDB yalnız authenticate yapar. Açılışta sync/alter/force veya `_backup` tablo temizleme yok.
- `database/migrations.ts` `schema_migrations` tablosuyla `001-initial-schema`, `002-auth-sessions`, `003-user-preferences-v1`, `004-session-activity-intervals`, `005-pomodoro-clocks`, `006-user-topic-progress` migration'larını çalıştırır. Yalnız açık `npm run db:migrate` komutu yazar; transaction içinde non-destructive sync ile ilk tabloları oluşturur, mevcut kayıtları korur.
- Var olan model tablolarında eksik kolon bulunursa özel migration gerekir; sessiz alter uygulanmaz. İlerideki şema değişimleri yeni migration olarak eklenmelidir. İlk baseline genel legacy şema onarım aracı değildir.
- Development seed yalnız development modunda, açık ADMIN_EMAIL/ADMIN_USERNAME ve en az 12 karakterli ADMIN_PASSWORD ile çalışır. findOrCreate + transaction; var olan hesap/parola/kategori sıfırlanmaz, parola loglanmaz.
- Kullanıcı DB'sinde migration/seed/reset/restore test amacıyla çalıştırılmaz. Testler mkdtemp altında kendi SQLite dosyasını oluşturup temizler.

## Modeller ve API

On üç model: User, Category, Course, Topic, Plan, StudySession, SessionInterval, PomodoroClock, UserTopicProgress, Settings, Backup, AuthSession, RefreshCredential. Veri alanları, tablolar ve lokalize difficulty değerleri bu pakette yeniden adlandırılmadı. Category global; Course kişisel/global; Topic derse; Plan ve StudySession kullanıcıya bağlı. Settings global key/value; User.preferences kişisel JSON.

- Auth: /api/auth/register, /login, /refresh-token, /logout; /me, /profile, /change-password. Access JWT yalnız bellekte; sid/id, açık HS256/issuer/audience doğrulaması ve DB session/aktiflik/rol kontrolü. Refresh opaque credential yalnız hash olarak DB'de; HttpOnly/SameSite Strict cookie, production Secure. Custom X-Requested-With ve origin denetimi var.
- Refresh IMMEDIATE transaction içinde döner; tekrar kullanım bütün aileyi iptal eder, session ömrü mutlak. Logout, parola değişimi/admin kurtarma, rol/aktiflik değişimi iptal uygular. Yeni parolalar 12 karakter/en fazla 72 UTF-8 bayt. Login/parola değişimi stale hash yarışını transaction içinde denetler.
- admin:manage CLI yalnız var olan/hazır DB ve private password file ile create/recover yapar; create admin yokken, recover tam e-posta ile aktif admin için çalışır. Öğrenci yükseltmez, parola loglamaz. Testler geçici DB'dedir.
- Course görünürlüğü `policies/courseAccess.ts`: sahibi veya global veya admin. Liste, tek ders, dersin konuları ve topic parent join'leri bu scope'u kullanır. User detail kendisi/admin ile sınırlı.
- Yeni StudySession ilişkisinde plan sahibi, ders/konu görünürlüğü, aktiflik ve topic-course eşleşmesi doğrulanır. Yalnız topic verilirse erişilebilir parent course çözülür.
- GET StudySession yan etkisizdir; not veya durum güncellemez. Zaman aşımı politikası henüz ayrı service olarak uygulanmadı.
- Create/update/action/delete services/studySessions.ts içinde IMMEDIATE transaction kullanır. Zorunlu expectedUpdatedAt ve monotonic timestamp ile stale 409, ortak durum politikası ve tek aktif seans uygulanır. Paused/completed zamanı rezerve eder; cancelled serbesttir. Ortak seans Zod şemaları contracts içindedir. Gerçek süre study/break/pause aralıkları ve IANA gün sınırlarıyla uygulanmıştır; eski hatalı ilişkiler/çakışmalar gerçek DB üzerinde taranıp değiştirilmedi.
- GET /settings yalnız public branding DTO; /settings/admin ve PUT admin/no-store. İzinli anahtar/tip şeması ve transaction'lı yazma var. allowRegistration/maintenanceMode public DTO'dadır ve register/login/protect'te uygulanır; sessionTimeout boşta süresi olarak rotateAuthSession'da uygulanır (maxStudentsPerCourse kaldırıldı; bildirim teslimatı yok). Ayar okuma tek kaynağı services/siteSettings.ts. Backup route'ları admin; native SQLite backup API, dosya dışı manifest/SHA-256/integrity/FK/şema kontrolü, güvenlik yedeği/atomik destination restore/rollback ve bakım kapısı uygulanmıştır. settings_only/all reset transaction'lıdır. Her 5 dakikadaki job ayarı yeniden okuyarak 1/5/7 tam gün hesabı yapar. Tek backend süreci sınırı, offsite/kapasite/retention işleri açık; otomatik yedek silme yoktur.
- Admin: `GET /users/admin-stats` (global özet) ve `GET /users?includeStats=true` (toplu kullanıcı özeti) `getAllTimeSummaries` kullanır; yalnız admin. Güncel check 223 test. Konu ilerlemesi: GET /topics/progress, PUT /topics/:id/progress (kullanıcıya özel).
- Merkezi hata handler Sequelize ValidationError→400, Unique/FK→409; beklenmeyen hata mesajı istemciye verilmez. Eski MongoDB hata eşlemeleri kaldırıldı. Joi/Zod/manual validation birleştirilmedi.

## Güncel görsel sistem (15 Ekim 2026)

Kalıcı tasarım kararı `design-system.md` içindedir; önceki iOS/pastel yaklaşım geçersizdir. CSS semantik açık/koyu token'ları, ortak PageHeader ve panel/kontrol sınıfları kullanılır. Geist Variable 5.3.0 self-hosted; Google Fonts linkleri kaldırıldı. canvas-confetti/@types kaldırıldı. Mobil navigasyon Headless UI Dialog, Framer Motion reducedMotion=user; CSS reduced-motion var. Ortak calendarViewport ölçülen satır konumuyla 08:00'e ilk kaydırmayı yapar.

Tasarım paketi kapanışında: 22 backend + 8 frontend = 30 test (tarihsel), strict typecheck/lint/build. Dolu geçici DB ile masaüstü/390×844 mobil görsel ve etkileşim kontrolleri yapıldı; otomatik E2E/WCAG değildir. Dashboard konu sayımı ve son aktivite sıralaması düzeltildi. A11 Preferences sync 400 tarayıcıda tekrar doğrulandı; yerel tema değişmesi sunucu kalıcılığı anlamına gelmez.

## Frontend

- App sayfaları lazy import ve Suspense ile yükler. ErrorBoundary kökte; hata halinde Türkçe kurtarma ekranı gösterir, iç hata detayını kullanıcıya açmaz. Source map build'de kapalı.
- QueryClient `src/lib/queryClient.ts` altında. Auth store kimlik değişiminde cache'i ve eski sorguları temizler; late response izolasyonu testlidir. Tüm kaynaklar account factory'den key alır; session görünümleri timezone/tarih de taşır. Güncel gün 30 saniye/focus ile yenilenir, yazmalar ilgili bütün özetleri prefix ile invalidate eder. Tercihler yalnız mevcut kullanıcı belleği/sunucuda, readNotifications hesap anahtarlı saklanır.
- Auth tek bellek kaynağı/refresh promise ve epoch ile yürür; geç yanıtlar bitmiş veya değişmiş hesabı geri getiremez. Geç 401 güncel token ile tekrar edilir. Cookie değişiklikleri ayrı Axios transport ve Web Locks ile sıraya konur; BroadcastChannel diğer sekmelerin cache/kimliğini temizler. Çevrimdışı logout için gizli bilgi taşımayan pending niyeti tutulur; reload bu durumda refresh yapmaz. Eski auth-storage temizlenir.
- Preferences v1 ortak şemadan türemiştir; /auth/profile ve admin patch satırı IMMEDIATE transaction içinde yükleyip birleştirir. 003 eski JSON'u dönüştürür, orijinali legacyPreferences içinde korur; API arşivi dışarı açmaz. Geçersiz gelecekteki sürüm toplu migration rollback'i üretir. Browser'daki sahipsiz eski değerler unassigned-account-state arşivinde korunur, hiçbir hesaba uygulanmaz.
- WeeklyPlanner/DailyCalendar tek PlannerCalendar/usePlannerCalendar/kart/geometry kullanır; ikinci işlem motoru kaldırıldı. PomodoroPage ve modal tek usePomodoro/PomodoroTimer ile sunucudaki kalıcı saati gösterir.
- Yedi erişilemeyen modül kaldırıldı: AdminScheduleManager, CourseManagementModal, AddTopicModal, EditTopicModal, GoalSettingModal, AdminCategoriesPage ve pages/courses placeholder. Kullanılan ders sayfası pages/CoursesPage.tsx.
- Grafik verisinin dahili saat/dakika anahtarları hours/minutes; Türkçe tooltip/içerik korunuyor. Login'deki sabit demo hesap listesi kaldırıldı.

## Kontroller ve kanıt

- `npm run setup`: npm ci → configure → build; DB'ye yazmaz.
- `npm run check`: ASCII teknik adlandırma → iki workspace typecheck → sıfır uyarılı lint → testler → build.
- TypeScript strict/optional/no-unused ayarları gevşetilmedi. ESLint temel JS/TS doğruluk ve unused kurallarını, hooks rules-of-hooks kuralını uygular. Mevcut any borcu veya bütün hooks/exhaustive-deps sorunları kapatılmış değildir; disable yorumuyla bastırma eklenmedi.
- Güncel check: **8 contracts + 125 backend + 90 frontend = 223 test**, atlanan yok; strict typecheck, sıfır uyarılı lint ve iki production build başarılı. Backend WAL/restore/rollback ve oturum yarışları, frontend gerçek HTTP transport ile eşzamanlı/geç 401 dahil.
- Yerel yeni admin ile giriş, reload/cookie bootstrap ve manuel snapshot tarayıcıda doğrulandı; gerçek DB'de reset/restore/seed yapılmadı.
- İlk paket tarihsel doğrulaması — Backend Node test runner + Supertest: 22 test; gerçek HTTP/geçici SQLite, env, hata response'ları ve migration/snapshot yolu. Frontend Vitest/Testing Library/jsdom: 5 test; ErrorBoundary ve hesap cache sınırı.
- GitHub Actions checkout/setup-node v7 + npm ci + check tanımlı; GitHub'da koşum yapılmadı.
- Production bundle tarayıcı smoke: geçici hesapla login/dashboard/haftalık/günlük planner. Fixture sunucusu/DB temizlendi. Tam E2E veya mobil/erişilebilirlik testi değildir.
- İlk paketin tarihsel statik bundle grafiği (tasarım sonrası yeniden ölçülmedi): boot JS 424.182 B / gzip 142.359 B; login ile 519.151 / 168.708 B. Rota chunk'ları ayrıca yüklenir; ağ/Lighthouse ölçümü değildir.
- İlk paketin lock audit sonucu: 12 etkilenen paket düğümü, 0 critical / 5 high / 7 moderate. Kalan grafik/router/css/Sequelize zinciri açık; production exploit olarak doğrulanmadı.

Ayrıntılar `implementation/2026-10-16-preferences-and-site-identity.md` ve `implementation/2026-10-15-security-and-recovery.md`, tarihsel temel `implementation/2026-10-15-foundation.md`, kalan işler `progress.md`, kalıcı kurallar `workingPrinciples.md` içindedir.

## 16 Ekim site kimliği ve geliştirme

Görünen ad/açıklama/logo/ikon public DTO'dan ortak Brand ve appearance katmanına gider; title/meta/favicon, login/register/sidebar/loading dahil. Public cache site-branding anahtarında; admin ayarları yalnız bellekte, hesap sınırında silinir. Public yenileme açılış/focus/60 saniye, eski response yeni kaydı ezemez. Static HTML title nötrdür; hosting domain'i admin siteName ile değişmez.

contracts tek kaynaktan CJS+ESM build üretir. Root dev başlangıçları önce contracts build; Vite --force + optimizeDeps include linked workspace'in Zod 4'ünü frontend Zod 3'ünden ayırır. Export değişince dev yeniden başlatılmalı; bağımsız fixture Vite cache'i kullanılmalı. Yeni Pomodoro seans formu kişisel varsayılanları kullanır; iki timer motoru daha sonraki A15 paketinde ortaklaştırıldı.

Yerel 003 geçişinden önce native private snapshot oluşturuldu (yol .local/preferences-upgrade-2026-10-16.json içinde). Kimlik/hash/oturum ve kayıt sayıları korundu; güncel şema yedeği id 3 oluşturuldu. Eski şema yedeği güncel restore şema kontrolünden geçmez; ayrı kopyada migration veya uyumlu uygulama sürümü gerekir. Gerçek veride reset/restore/seed yapılmadı. Son temiz npm ci başarılı; audit 12 (5 high/7 moderate), üretim güvenlik/dağıtım onayı değildir.

## 16 Ekim seans bütünlüğü

Önceki A07/A08 paketi kolon/migration gerektirmiyordu. API/frontend birlikte kullanılmalı; eski sekme expectedUpdatedAt taşımadığında 400 alır ve reload gerekir. Her seans yazması service transaction'ından dönen güncel snapshot'ı kullanır. Gerçek kullanıcı DB'sinde migration/seed/reset/restore yok. Bu önceki paketin root check sonucu 108 test/typecheck/lint/build başarılıydı; fixture production tarayıcı pause/resume/complete kontrolü yapıldı. Detay: implementation/2026-10-16-session-integrity.md. Eski ajan dev kopyası kapatıldı; kullanıcının backend watch'ı korundu, frontend --force ile yeniden başlatıldı. Localhost:3000/API 5002'de tek listener vardır.

## 16 Ekim gerçek süre/saat dilimi

Luxon 3.7.2 + @types/luxon 3.7.6 contracts/frontend bağımlılığıdır. Ortak time şeması, CalendarDate görünüm adaptörü ve gerçek instant dönüşümü kullanılır; synthetic date doğrudan API'ye yazılmaz. 004 yalnız trackingCoverage kolonu ve session_intervals tablosu/index'lerini ekler; eski kayıt untracked, yeni model create complete. Gerçek süre tablo aralıklarından; eski duration değerleri korunur, ölçüm sayılmaz. DTO measured saniye/asOf/coverage taşır; /study-sessions/stats ve self/admin /users/:id/stats ortak service'i kullanır.

Temiz npm ci + 125 test/typecheck/lint/build başarılı. Audit 12 (5 high/7 moderate) aynı açık backlog'dur. Native private önceki schema snapshot yolu .local/tracking-upgrade-2026-10-16.json içinde; 004 sonrası bütün eski tablo satırları/parola/kimlik/not/zaman/durum korunma karşılaştırması ve güncel schema backup id 4 tamamlandı. Reset/restore/seed yok. Eski schema snapshot current restore tarafından reddedilir; ayrı kopyada kontrollü yükseltme gerekir. Eski dev süreçleri kapatıldı, tek root npm run dev localhost:3000/API 5002 üzerinde çalışır. Geçici fixture tarayıcı/DB süreçleri temizlendi. Detay: implementation/2026-10-16-study-time-and-timezones.md.

## 16 Ekim katalog bütünlüğü

Yeni migration/dependency yok; mevcut schema 004 korunur. services/catalog.ts bütün HTTP katalog yazmalarında IMMEDIATE check/write uygular. Ortak contracts/catalog.ts runtime şemaları/API tipleri, topic updatedAt kancası ve reorder full snapshot/409 vardır. Ders silme FK'leri explicit instance save ile temizleyip session sürümünü ilerletir; topic cascade, session/interval geçmişini korur. Kategori taşıma/silme tek transaction; genel metadata last-writer-wins. Konu formunun gereksiz farklı-cache-shape ders sorgusu kaldırıldı, sıra backend'de hesaplanır. Eski sekmeler yeni reorder sözleşmesi için reload edilmelidir.

Güncel check 151 test/typecheck/lint/build; log /tmp/study-tracker-catalog-check.log. Production fixture klavye reorder/reload, konu create ve servis delete sonrası 5 dk geçmiş UI'sı testli; geçici DB/sunucular temizlendi. Gerçek DB'de verification yazması/migration/seed/reset/restore yapılmadı. Tek root dev contracts + Vite --force ile yeniden başlatıldı; log /tmp/study-tracker-catalog-dev.log. A24 local-only konu ilerlemesi yeni açık bulgu. Detay: implementation/2026-10-16-catalog-integrity.md.

## 16 Ekim kalıcı Pomodoro

A15 uygulandı: Pomodoro sayfası ve planlayıcı modalı tek usePomodoro/PomodoroTimer kullanır. Faz, döngü, milisaniye kalan süre ve mutlak deadline 005-pomodoro-clocks tablosunda saklanır; tarayıcı callback sayısı süre değildir. Sunucu scheduler'ı fazı kalıcı deadline'da ilerletir. Otomatik mola açıkça seçilir; mola sonunda çalışma kendiliğinden başlamaz. Reload/modal kapatma/rota değişimi sayacı durdurmaz. Eski kayıtta bilinmeyen faz uydurulmaz; kullanıcı sayacı açıkça etkinleştirir.

Komutlar expectedUpdatedAt + ortak IMMEDIATE seans transaction'ıyla yürür; genel planner eylemleri aynı kurala bağlıdır. Gecikmiş worker öncesi GET/stats açık çalışma/mola süresini deadline'da sınırlar ve yazmaz. Reset kullanıcı notunu veya ölçüm geçmişini silmez. Scheduler bakım/restore kapısında durur, yürüyen iş boşaltılır. Hesap anahtarında numeric/string ID normalizasyonu, sürüm/epoch koruması ve yalnız hesap kimliği taşıyan sekme invalidation bildirimi var.

Gerçek yerel 005 yükseltmesi native özel snapshot, eski bütün tablo satırlarının korunma karşılaştırması ve güncel schema manuel backup id 5 ile tamamlandı; seed/reset/restore yok. Tek root dev localhost:3000/API 5002 çalışır. Test/production fixture kanıtı ve sınırlar: implementation/2026-10-16-pomodoro-continuity.md.

Yeni bağımlılık yok. 005 startup/snapshot schema kapısında zorunludur; eski snapshot ayrı kopyada kontrollü yükseltilmeden current restore ile yüklenmez. Root check 175 test/typecheck/lint/build; log /tmp/study-tracker-pomodoro-check.log. Dev log /tmp/study-tracker-pomodoro-dev.log. Sunucu 1 saniyelik wake-up ile en eski 100 due clock üzerinde transaction çalıştırır; uzun kesintide en fazla biten çalışma ve seçilmiş mola tamamlanır, sahte çalışma döngüsü üretilmez. Client render 250 ms, detail refetch 30 saniye/due 2 saniye ve focus/reconnect, liste 60 saniyedir. Yük testi yapılmadı.

## Güncel entegrasyon kapanışı — 16 Ekim

Kullanıcı limit nedeniyle başka yapay zekâlarla A17/A18/A24 ve ek düzeltmeleri tamamladı; güncel progress ve kod esas alındı, bu paketler yeniden uygulanmadı. Yarım kalan A15 kapanışı (tarayıcı kanıtı/temizlik/bellek kaydı) tamamlandı. Bütün güncel kodla npm run check yeniden başarılı: **8 contracts + 123 backend + 53 frontend = 184 test**, atlanan yok; naming/strict/lint/production build geçti. Log /tmp/study-tracker-final-integration-check.log.

A24'ün açık kalan normal yerel 006 yükseltmesi de tamamlandı: dev süreçleri durduruldu; native özel snapshot checksum/integrity/FK ile doğrulandı (.local/topic-progress-upgrade-2026-10-16.json özel pointer, 0600). npm run db:migrate sonrası önceki 12 tablonun bütün satırları snapshot ile aynı bulundu; user_topic_progress boş, geçmiş durum türetilmedi. Güncel schema manuel backup id 6 alındı. Gerçek veride seed/reset/restore veya test fixture yazması yok. Tek root npm run dev localhost:3000/API 5002 üzerinde yeniden başlatıldı; log /tmp/study-tracker-final-integration-dev.log. Commit/push/deployment yok.

A17/A18/A24 için önceki kayıtların kanıt sınırı korunur; bu kapanışta onların yeni manuel tarayıcı doğrulaması yapılmadı. Sonraki açık işler progress listesindeki A21/A19/A22/A04'tür.

## Ortak planlayıcı — 16 Ekim

A21'in planlayıcı alt paketi tamamlandı. WeeklyPlanner/DailyCalendar tek PlannerCalendar, usePlannerCalendar, CalendarSessionCard ve calendarGeometry kullanır; eski iki motor kaldırıldı. Drag/resize/tarih taşıma ve seans komutları aynı busy ref, sunucu onayı/sürüm ve auth epoch sınırındadır. 409 yazmayı otomatik tekrarlamaz; güncel kaynak okunur, açık hedef tarih korunur ve yeni kullanıcı onayı gerekir. Gerçek end-start süresi korunur, gece yarısında sessiz kırpma kaldırıldı; ortak CalendarDate dönüşümü artık milisaniyeyi korur. Async Confirm/Move dialog başarı bekler, hata/pending görünürdür.

npm run check: **8 contracts + 123 backend + 74 frontend = 205 test**, atlanan yok; naming/strict/lint/production build başarılı. Production fixture'da native drag 09:00→11:15, resize 60→90 dk, ertesi güne taşıma, günlük/haftalık/reload ve gerçek edit formu doğrulandı. Temp DB'de 3 planlanmış seans/notlar ve gece seansı korundu; ölçüm uydurulmadı. Fixture temizlendi. Gerçek DB'de migration/seed/reset/restore veya test verisi yazılmadı; yerel schema 006 korunur. Tek root dev localhost:3000/API 5002, log /tmp/study-tracker-shared-planner-dev.log. Commit/push/deployment yok. Detay: implementation/2026-10-16-shared-planner.md.

**A21 bütünüyle kapanmadı:** öğrenci özel ders/konu düzenleme-silme UI'ı ve kalan modal/admin nötr tasarım geçişi açıktır. A19/A22/A04 sırası korunur.

API/şema/dependency değişmedi. Drag 15 dk, resize 5 dk (5–1440 dk), gerçek end-start süre korunur. Split kart ilk segmentten taşınır/son segmentten resize edilir. Tam DST grid/roving focus/touch/WCAG/E2E ve yük ölçümü açık. Check log /tmp/study-tracker-shared-planner-check.log.


## Katalog düzenleme kapanışı — 16 Ekim

Öğrencinin kendi özel ders/konusunu düzenleme ve ders silme/konu arşivleme arayüzü tamamlandı. Arşivden geri alma ve arşivde düzenleme eklendi. CourseEditorModal öğrenci/admin create/edit için tek uygulamadır; TopicEditorModal da create/edit'i birleştirir. Eski iki create modalı ve admin içindeki ikinci CourseModal kaldırıldı. Ortak dialog/ikon/yetki ve mutation sınırı vardır; shared contracts doğrulaması, değişen alanları gönderme, taslak/hata/pending koruması ve account epoch izolasyonu testlidir. Ders listesi/detayı ve admin ders yönetimi nötr tasarım sistemine taşındı. Restore sırasında aktif aynı ad çakışması transaction içinde 409 ile reddedilir; ilerleme/geçmiş korunur.

`npm run check`: **8 contracts + 125 backend + 90 frontend = 223 test**, atlanan yok; naming/strict/lint/production build başarılı. Son erişilebilir drag-handle adı eklemesinden sonra ilgili frontend typecheck/lint/5 component testi/build tekrar geçti. Production fixture'da öğrenci ders/konu edit, arşiv UI/geri alma/reload ve admin ortak ders create doğrulandı. Temp SQLite kontrolünde completed ilerleme, seans notları/bağlantıları ve 300 ölçülmüş saniye korundu; FK temiz. Tarayıcıdaki son kalıcı silme onayı iptal edildi; silme API/SQLite regresyonlarında testlidir. Fixture süreçleri/sekmesi/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002 çalışır; log /tmp/study-tracker-shared-planner-dev.log. Commit/push/deployment yok. Detay: implementation/2026-10-16-catalog-editing.md.

**A21 kalan:** kategori/kullanıcı/ayar ve diğer modal/admin yüzeylerinde nötr tasarım tutarlılığı. Öğrenci katalog UI ve ortak planner tamamdır; A19/A22/A04 açık kalır.
