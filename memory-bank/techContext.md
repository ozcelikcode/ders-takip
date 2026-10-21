# Ders Takip Sistemi — Teknik Bağlam

Kaynak ve doğrulama: 18 Ekim 2026, A22 erişilebilirlik/Lighthouse tabanı. Başlangıç incelemesi tarihsel raporda tutulur; aşağıdaki mevcut durum onun yerini alır.

## Araç zinciri

- npm workspaces: `packages/contracts`, `backend` ve `frontend`; teknik paket adları study-tracker / @study-tracker/backend / @study-tracker/frontend.
- Node 24.21.0 (`.nvmrc`, `.node-version`); npm 11.19.0; engine-strict. Tek kök package-lock.json izlenir ve npm ci kullanılır.
- Vite 8.3.4 / React plugin 6.1.2; ESLint 10.12.0 flat config / typescript-eslint 8.71.2; Vitest 5.0.4; TypeScript 5.9.3'e sabit.
- Backend hâlâ Express 4 + Sequelize 6; sqlite3 6.0.1'e güncellendi. Jest/ts-jest/nodemon/ts-node kaldırıldı; dev/seed tsx 4.23.15 ile çalışır.
- Frontend React 18, Router 6, Zustand 4, Query 5, Axios 1, RHF 7, Zod 4.6.7, Tailwind 4.3.3 (`@tailwindcss/vite`; config ve PostCSS dosyası yok, tema `index.css` `@theme` içinde), Headless UI 1, Framer Motion 10, Recharts 2. Bu kütüphanelerin tümü son major'a taşınmış değildir; uyumluluk ve güvenlik dönüşümü açık iştir.
- Backend ve frontend doğrulama Zod 4; Preferences/site ayarları/auth/profile/admin kullanıcı/Plan/backup contracts içinde ortaktır. Joi ve Zod 3 aktif yolları A19 ile kaldırıldı. Bütün diğer API yanıtlarının runtime DTO dönüşümü tamamlanmadı. express-validator/winston/fs-extra ve frontend tailwind-merge/devtools kullanılmadığı için kaldırıldı. Tailwind yalnız `@tailwindcss/forms` eklentisini kullanır (`@plugin`); çalışma anı marka rengi `--primary-rgb` RGB kanallarıdır (hiçbir yerde kullanılmayan `secondaryColor` site ayarı 21 Ekim'de kaldırıldı; saklanmış eski satır okuyucu tarafından yok sayılır), `--color-primary-*` tema renkleri bundan türer (typography/aspect-ratio ve kullanılmayan palet/spacing 19 Ekim temizliğinde kaldırıldı); `eslint-plugin-react-hooks` kök devDependency'dir.
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
- `database/migrations.ts` `schema_migrations` tablosuyla `001-initial-schema`, `002-auth-sessions`, `003-user-preferences-v1`, `004-session-activity-intervals`, `005-pomodoro-clocks`, `006-user-topic-progress`, `007-password-reset-tokens`, `008-personal-categories`, `009-notifications` migration'larını çalıştırır. Yalnız açık `npm run db:migrate` komutu yazar (008 kategori tablosunu yeniden kurduğu için ana bağlantıda kendi transaction'ıyla, FK kapalıyken çalışır ve commit öncesi `foreign_key_check` yapar); transaction içinde non-destructive sync ile ilk tabloları oluşturur, mevcut kayıtları korur.
- Var olan model tablolarında eksik kolon bulunursa özel migration gerekir; sessiz alter uygulanmaz. İlerideki şema değişimleri yeni migration olarak eklenmelidir. İlk baseline genel legacy şema onarım aracı değildir.
- Development seed yalnız development modunda, açık ADMIN_EMAIL/ADMIN_USERNAME ve en az 12 karakterli ADMIN_PASSWORD ile çalışır. findOrCreate + transaction; var olan hesap/parola/kategori sıfırlanmaz, parola loglanmaz.
- Kullanıcı DB'sinde migration/seed/reset/restore test amacıyla çalıştırılmaz. Testler mkdtemp altında kendi SQLite dosyasını oluşturup temizler.

## Modeller ve API

On üç model: User, Category, Course, Topic, Plan, StudySession, SessionInterval, PomodoroClock, UserTopicProgress, Settings, Backup, AuthSession, RefreshCredential. Veri alanları, tablolar ve lokalize difficulty değerleri bu pakette yeniden adlandırılmadı. Category global; Course kişisel/global; Topic derse; Plan ve StudySession kullanıcıya bağlı. Settings global key/value; User.preferences kişisel JSON.

- Auth: /api/auth/register, /login, /refresh-token, /logout; /me, /profile, /change-password. Access JWT yalnız bellekte; sid/id, açık HS256/issuer/audience doğrulaması ve DB session/aktiflik/rol kontrolü. Refresh opaque credential yalnız hash olarak DB'de; HttpOnly/SameSite Strict cookie, production Secure. Custom X-Requested-With ve origin denetimi var.
- Refresh IMMEDIATE transaction içinde döner; tekrar kullanım bütün aileyi iptal eder, session ömrü mutlak. Logout, parola değişimi/admin kurtarma, rol/aktiflik değişimi iptal uygular. Yeni parolalar 12 karakter/en fazla 72 UTF-8 bayt. Login/parola değişimi stale hash yarışını transaction içinde denetler.
- admin:manage CLI yalnız var olan/hazır DB ve private password file ile create/recover yapar; create admin yokken, recover tam e-posta ile aktif admin için çalışır. Öğrenci yükseltmez, parola loglamaz. Testler geçici DB'dedir.
- Course görünürlüğü `policies/courseAccess.ts`: sahibi veya global veya admin. Liste, tek ders, dersin konuları ve topic parent join'leri bu scope'u kullanır. 18 Ekim temizliğiyle frontend'in çağırmadığı `GET /categories/:id`, `GET /topics`, `GET /topics/:id` ve `GET /users/:id` uçları (route, controller, istemci metodu, testler) silindi; konu okuması `GET /courses/:id/topics` ve `GET /topics/progress` üzerinden, kullanıcı stats'ı `GET /users/:id/stats` (self/admin sınırı) ile sürer. PUT/DELETE uçları değişmedi.
- Yeni StudySession ilişkisinde plan sahibi, ders/konu görünürlüğü, aktiflik ve topic-course eşleşmesi doğrulanır. Yalnız topic verilirse erişilebilir parent course çözülür.
- GET StudySession yan etkisizdir; not veya durum güncellemez. Zaman aşımı politikası henüz ayrı service olarak uygulanmadı.
- Create/update/action/delete services/studySessions.ts içinde IMMEDIATE transaction kullanır. Zorunlu expectedUpdatedAt ve monotonic timestamp ile stale 409, ortak durum politikası ve tek aktif seans uygulanır. Paused/completed zamanı rezerve eder; cancelled serbesttir. Ortak seans Zod şemaları contracts içindedir. Gerçek süre study/break/pause aralıkları ve IANA gün sınırlarıyla uygulanmıştır; eski hatalı ilişkiler/çakışmalar gerçek DB üzerinde taranıp değiştirilmedi.
- GET /settings yalnız public branding DTO; /settings/admin ve PUT admin/no-store. İzinli anahtar/tip şeması ve transaction'lı yazma var. allowRegistration/maintenanceMode public DTO'dadır ve register/login/protect'te uygulanır; sessionTimeout boşta süresi olarak rotateAuthSession'da uygulanır (maxStudentsPerCourse kaldırıldı; bildirim teslimatı yok). Ayar okuma tek kaynağı services/siteSettings.ts. Backup route'ları admin; native SQLite backup API, dosya dışı manifest/SHA-256/integrity/FK/şema kontrolü, güvenlik yedeği/atomik destination restore/rollback ve bakım kapısı uygulanmıştır. settings_only/all reset transaction'lıdır. Her 5 dakikadaki job ayarı yeniden okuyarak 1/5/7 tam gün hesabı yapar. Tek backend süreci sınırı, offsite/kapasite/retention işleri açık; otomatik yedek silme yoktur.
- Admin: `GET /users/admin-stats` (global özet) ve `GET /users?includeStats=true` (toplu kullanıcı özeti) `getAllTimeSummaries` kullanır; yalnız admin. Güncel check 361 workspace testi + 36 browser yürütmesi/150 axe taraması ve 12 Lighthouse ölçümü. Konu ilerlemesi: GET /topics/progress, PUT /topics/:id/progress (kullanıcıya özel).
- Merkezi hata handler Sequelize ValidationError→400, Unique/FK→409; beklenmeyen hata mesajı istemciye verilmez. Eski MongoDB hata eşlemeleri kaldırıldı. Auth/user/plan/backup giriş doğrulamaları ortak contracts ve validate sınırında birleşti; hata ayrıntısı ortak field/message biçimidir.

## Güncel görsel sistem (15 Ekim 2026)

Kalıcı tasarım kararı `design-system.md` içindedir; önceki iOS/pastel yaklaşım geçersizdir. CSS semantik açık/koyu token'ları, ortak PageHeader ve panel/kontrol sınıfları kullanılır. Geist Variable 5.3.0 self-hosted; Google Fonts linkleri kaldırıldı. canvas-confetti/@types kaldırıldı. Mobil navigasyon Headless UI Dialog, Framer Motion reducedMotion=user; CSS reduced-motion var. Ortak calendarViewport ölçülen satır konumuyla 08:00'e ilk kaydırmayı yapar.

Tasarım paketi kapanışında: 22 backend + 8 frontend = 30 test (tarihsel), strict typecheck/lint/build. Dolu geçici DB ile masaüstü/390×844 mobil görsel ve etkileşim kontrolleri yapıldı; otomatik E2E/WCAG değildir. Dashboard konu sayımı ve son aktivite sıralaması düzeltildi. A11 Preferences sync 400 tarayıcıda tekrar doğrulandı; yerel tema değişmesi sunucu kalıcılığı anlamına gelmez.

## Frontend

- Yerel ayar `lib/locale.ts` tek kaynaktır (appLocale, date-fns locale, hafta günü etiketleri, tarayıcı saat dilimi). Hafta başlangıcı `useWeekStart()` / `resolveWeekStart` ile okunur; kayıt sırasında tarayıcı saat dilimi gönderilir.
- Paketleme: contracts ESM `sideEffects:false`; luxon yalnız `zonedTime.ts`'te (şema modülleri luxon'suz); Vite `icons` manualChunk; Layout ve grafik lazy. Üretim sunucusu JS/CSS'i gzip/brotli ile sunmalı (ölçüm fixture'ı gzip kullanır). React Router 7.
- Şifre sıfırlama: `services/passwordReset.ts` + `services/mailer.ts` (nodemailer, opsiyonel SMTP env); SMTP yoksa admin tek kullanımlık bağlantı üretir. Schema artık 007'dir.
- Görünen ana kavram kelimeleri (ders/konu/seans) site/kişisel `terminologyPreset` ya da `customTerminology` (R2d) üzerinden `resolveTerminology` + `useTerms()` ile türetilir; kelime/ek mantığı `packages/contracts/src/terminology.ts`'tedir. Ekranlara sabit ders/konu/seans yazılmaz; backend mesajları nötr "kayıt" ifadesi kullanır.

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
- TypeScript strict/optional/no-unused ayarları gevşetilmedi. ESLint temel JS/TS doğruluk ve unused kurallarını, hooks rules-of-hooks kuralını uygular. Frontend transport `services/httpClient.ts`'tedir (axios örnekleri/interceptor); `services/api.ts` kaynak API'lerini toplar. `@typescript-eslint/no-explicit-any` artık `error`dur ve kaynakta 0 `any` vardır (19 Ekim temizliği); bütün hooks/exhaustive-deps sorunları kapatılmış değildir; disable yorumuyla bastırma eklenmedi.
- Güncel check: **18 contracts + 143 backend + 200 frontend = 361 workspace testi**, ayrıca **36 browser yürütmesi/150 axe taraması ve 12 Lighthouse ölçümü**, atlanan yok; strict typecheck, sıfır uyarılı lint ve iki production build başarılı. Backend WAL/restore/rollback ve oturum yarışları, frontend gerçek HTTP transport ile eşzamanlı/geç 401 dahil.
- Yerel yeni admin ile giriş, reload/cookie bootstrap ve manuel snapshot tarayıcıda doğrulandı; gerçek DB'de reset/restore/seed yapılmadı.
- İlk paket tarihsel doğrulaması — Backend Node test runner + Supertest: 22 test; gerçek HTTP/geçici SQLite, env, hata response'ları ve migration/snapshot yolu. Frontend Vitest/Testing Library/jsdom: 5 test; ErrorBoundary ve hesap cache sınırı.
- GitHub Actions checkout/setup-node v7 + npm ci + check tanımlı; GitHub'da koşum yapılmadı.
- Production bundle tarayıcı smoke: geçici hesapla login/dashboard/haftalık/günlük planner. Fixture sunucusu/DB temizlendi. Tam E2E veya mobil/erişilebilirlik testi değildir.
- İlk paketin tarihsel statik bundle grafiği (tasarım sonrası yeniden ölçülmedi): boot JS 424.182 B / gzip 142.359 B; login ile 519.151 / 168.708 B. Rota chunk'ları ayrıca yüklenir; ağ/Lighthouse ölçümü değildir.
- İlk paketin lock audit sonucu: 12 etkilenen paket düğümü, 0 critical / 5 high / 7 moderate. Kalan grafik/router/css/Sequelize zinciri açık; production exploit olarak doğrulanmadı.

Ayrıntılar `implementation/2026-10-16-preferences-and-site-identity.md` ve `implementation/2026-10-15-security-and-recovery.md`, tarihsel temel `implementation/2026-10-15-foundation.md`, kalan işler `progress.md`, kalıcı kurallar `workingPrinciples.md` içindedir.

## 16 Ekim site kimliği ve geliştirme

Görünen ad/açıklama/logo/ikon public DTO'dan ortak Brand ve appearance katmanına gider; title/meta/favicon, login/register/sidebar/loading dahil. Public cache site-branding anahtarında; admin ayarları yalnız bellekte, hesap sınırında silinir. Public yenileme açılış/focus/60 saniye, eski response yeni kaydı ezemez. Static HTML title nötrdür; hosting domain'i admin siteName ile değişmez.

contracts tek kaynaktan CJS+ESM build üretir. Root dev başlangıçları önce contracts build; Vite --force + optimizeDeps include linked workspace'i yeniden optimize eder. Üç workspace A19 sonrası aynı Zod 4.6.7 kullanır; Joi/Zod 3 aktif yolu kalmadı. Export değişince dev yeniden başlatılmalı; bağımsız fixture Vite cache'i kullanılmalı. Yeni Pomodoro seans formu kişisel varsayılanları kullanır; iki timer motoru daha sonraki A15 paketinde ortaklaştırıldı.

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


## Kategori yönetimi ve tests/ — 17 Ekim

Kategori yönetimi alt paketi tamamlandı: nötr liste ve ortak CategoryEditorModal/CatalogEditorDialog; shared contracts doğrulaması, yalnız değişen alanların kaydı, hata/boş/retry ayrımı, pasif kategori görünürlüğü ve taslak koruması. Silme/taşıma onayı sunucu başarısını bekler; hedef açıkça seçilir, hata/pending/çift gönderim ve account epoch sınırı uygulanır. İç içe Dialog Escape/odak dönüşü testlidir. Eski inline form/ikon/mutation tekrarları kaldırıldı.

Yeni 13 ekran regresyonu frontend/tests/category-management.test.tsx içindedir; tests/ Vitest, strict TypeScript ve ESLint kapsamına alındı. Mevcut src testleri korunur; topluca taşıma veya kopyalama yapılmadı. npm run check: **8 contracts + 125 backend + 103 frontend = 236 test**, atlanan yok; naming/strict/lint/production build başarılı. Ayrı production fixture'da create/edit/pasiflik/Escape ve taşıma onayı/iptal kontrol edildi. Temp API ile 3 özel/ortak/pasif ders taşındı; konu/ilerleme/seans/not/300 saniyelik interval geçmişi birebir korundu, integrity/FK temiz. Tarayıcı reload yeni kategori adını gösterdi. Fixture sekme/süreç/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok. Tek root dev localhost:3000/API 5002, log /tmp/study-tracker-category-management-dev.log. Detay: implementation/2026-10-17-category-management.md.

**A21 kalan:** kullanıcı yönetimi/oluşturma ve ayar/yedekleme ekranlarının nötr tasarım, async onay, hata/taslak ve hesap sınırı tutarlılığı. Kategori ve öğrenci katalog UI/ortak planner tamamdır. A19/A22/A04 açık kalır.


## A21 kullanıcı yönetimi — 17 Ekim 2026

Kullanıcı yönetimi/oluşturma tamamlandı: nötr yüzeyler, 20 kayıt/sayfa ve sunucu toplamı, bütün kayıtlarda sunucu araması, stabil ikincil ID sıralaması, hata/boş/retry ayrımı ve son satır sonrası sayfa düzeltmesi. Rol/durum/silme onayları sunucu başarısını bekler; hata, pending, çift gönderim, öz-koruma ve hesap epoch sınırı uygulanır. Oluşturma istemci/admin POST ortak Zod 4 sözleşmesiyle doğrulanır; parola tekrarı gönderilmez, form yeniden açılınca eski kimlik bilgileri temizlenir. EditorDialog ve useAccountMutation katalog ile kullanıcı akışlarında ortaktır; eski CatalogEditorDialog kaldırıldı.

npm run check: **10 contracts + 130 backend + 116 frontend = 256 test**, atlanan yok; naming/strict/lint/production build başarılı. Yeni 13 frontend ekran testi frontend/tests/user-management.test.tsx, 5 temp HTTP/SQLite testi backend/tests/user-management.test.cjs, 2 sözleşme testi packages/contracts/tests/users.test.cjs içindedir. Production bundle ayrı atılabilir DB'de 102 kullanıcı/6 sayfa, ikinci sayfa, tüm katalog araması, silme onayı/iptal, oluşturma formu etiketleri ve Escape/odak dönüşüyle doğrulandı. Tarayıcıdan kalıcı silme/rol değişikliği/yeni parola kaydı yapılmadı; bunların davranışı otomatik test kapsamındadır. Fixture sekme/süreç/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002, log /tmp/study-tracker-user-management-dev.log. Detay: implementation/2026-10-17-user-management.md.

**A21 kalan:** AdminSettingsPage ayar/yedekleme taslak/refetch, dirty patch, backup GET hata/boş ayrımı ve restore/reset async onay/busy/error/epoch; verified === true kontrolü. Diğer kalan admin yüzeylerinin nötr tasarım incelemesi sürer. A19 kalan auth/user update/plan/backup DTO ve Plan sözleşmesi; A22/A04 açıktır.


## A21 site ayarları/yedekleme — 17 Ekim 2026

Site ayarları ve yedekleme alt paketi tamamlandı. AdminSettingsPage nötr tasarım ve etiketli alanlar kullanır; pristine form yeni okumayı izler, düzenlenen taslak refetch/bölüm değişiminde korunur. Shared schema ile yalnız değişen alanlar kaydedilir; no-op yazmaz, hata taslağı korur. Private settings read/write revision + account generation geç yanıtı sınırlar. Public hata private hatayı ezmez.

BackupPanel hesaplı Query ile loading/error/retry/boş listeyi ayırır. Restore yalnız verified === true ise açılır; dirty taslakta restore/reset kapalıdır. Ayar/yedek/restore/reset tek busy/mount/epoch hook'u ve async ConfirmDialog kullanır; pending kapama/çift gönderim kilitlidir. Restore ack sonrası protected refetch öncesinde logout; reset ack sonrası account invalidation + private settings yeniden okuma vardır. Native confirm/gecikmeli reload kaldırıldı. Bildirim teslimatı/offsite/saklama altyapısı uygulanmış gibi gösterilmez.

npm run check: **10 contracts + 130 backend + 138 frontend = 278 test**, atlanan yok; naming/strict/lint/production build başarılı. Yeni 18 ekran testi frontend/tests/admin-settings.test.tsx, 4 store yarış/sınır regresyonu var. Son frontend strict/root lint tekrar geçti. Temp production fixture: taslak/bölüm/dirty kilit, verified/unverified liste, manuel backup create/refetch, restore Escape/odak ve settings_only iptal doğrulandı. Temp snapshot checksum/integrity ve hesap/site ayarı korunması kontrol edildi; kaydedilmemiş taslak DB'ye yazılmadı. Tarayıcı restore/reset final onayı verilmedi; gerçek servis davranışları mevcut temp SQLite testlerinde geçer. Fixture sekme/süreç/DB temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002 sağlıklı; log /tmp/study-tracker-user-management-dev.log. Detay: implementation/2026-10-17-admin-settings-and-backups.md.

**Sıradaki:** A21 diğer modal/admin (özellikle yönetim özeti) nötr yüzey/kullanılmayan yol son denetimi; ardından A19 auth/user update/backup/plan DTO ve Plan ürün anlamı. A22/A04 ve bağımlılık backlog'u açık.


## A21 yönetim özeti ve seans yüzeyleri — 17 Ekim 2026

Yönetim özeti nötr yüzeylere geçirildi; global sayılar ve ölçülen süre korunur, beş durum/tür doğru etiketlenir. Özet ve son kullanıcılar bağımsız loading/error/retry/gerçek boş durumlarını gösterir. GoalsOverview kaldırıldı; gerçek işlevi karşılayan TodaysPlans tek günlük işlem/editor sınırıdır.

Günlük işlemler ve seans editörü ortak useAccountMutation busy/mount/epoch sınırını kullanır. Pending kapama/çift gönderim kilitlidir, async onay sunucuyu bekler. 409 otomatik yazma tekrarlamaz; güncel kaynak okunur, taslak korunur ve yeni açık onay gerekir. Başarısız kaynak okuması eski sürümle yazmayı engeller. Nested silme onayı Escape/odak/taslak korur. Kapalı editör ders sorgulamaz; mevcut pasif ders, tarihsel başlık ve açıklamayı temizleme korunur. Pomodoro ortak sayaç üzerinden açılır; ikinci motor yoktur. Dekoratif modal yüzeyleri ve tekrar eden yaşam döngüsü yolları kaldırıldı.

npm run check: **10 contracts + 130 backend + 162 frontend = 302 test**, atlanan yok; naming/strict/lint/production build geçti. Son editör temizliğinden sonra frontend strict/lint/162 test/build tekrar geçti. Yeni 8 yönetim özeti ve 16 seans yüzeyi regresyonu frontend/tests altındadır. Üretim import grafiğinde 73/73 kaynak erişilebilir; bu tüm export/runtime kullanım kanıtı değildir.

Atılabilir production fixture ile global özet/ölçülen süre/beş durum, günlük plan, editör yerel taslağı, nested Escape ve odak dönüşü doğrulandı. SQLite bütünlüğü ve özgün kayıtların değişmediği kontrol edildi. Tarayıcıda save/start/delete yapılmadı; yazma davranışı otomatik test kapsamındadır. Geçici oturum kapatıldı, sekme/süreç/DB temizlendi. Gerçek DB'ye test yazması/migration/seed/reset/restore yapılmadı; schema 006 korunur. localhost:3000 HTTP 200 ve API 5002 sağlıklı; iki portta birer servis var. Detay: implementation/2026-10-17-admin-and-session-surfaces.md.

**Sıradaki:** A19 auth/user update/backup/plan ortak DTO ve Plan API/StudySession ürün anlamı. A21 admin/modal/today alt kapsamı kapandı; performans ve bütün proje bakımı tamamlanmış sayılmaz. Header bildirim hata/boş ayrımı ve popover klavye/odak A22'ye kaydedildi. A22/A04 ve bağımlılık backlog'u açıktır.


## A19 ortak sözleşmeler ve Plan sınırları — 17 Ekim 2026

A19 auth/user update/backup/plan doğrulama ve bu yüzeylerin DTO/Plan ayrımı kapsamı tamamlandı. Ortak Zod 4 şemaları normalize edilmiş body/query/params üretir; belirtilmeyen request bölümleri korunur. Joi dosyası/paketi kaldırıldı. Public register yetki alanlarını reddeder; admin patch rol/aktiflik varsayılanı üretmez. Profil/parola/query/ID/null ve UTF-8 sınırları ortak kaynaktan gelir. Validation hataları field/message biçimindedir.

Auth ve kullanıcı yanıtları tek izinli userResponse projeksiyonudur. İstemci auth/profile/admin liste-özet/backup yanıtlarını runtime doğrular; bozuk yanıt başarı/boş veri olmaz. Numeric API ID auth view sınırında String'e dönüştürülür. Backup DTO host path döndürmez; verified gerçek boolean ve reset safetyBackupId doğrulanır. Eski hesaptan geç parola yanıtı yeni hesabı logout etmez.

Plan isteğe bağlı tarihli hedef kabı, takvim girdisi StudySession'dır. Otomatik/zorunlu Plan veya yeni hedef ekranı eklenmedi; kullanılmayan frontend plansAPI/Plan tipleri kaldırıldı. Plan create/update/reactivation tek IMMEDIATE transaction'da tarih/aktif çakışmasını denetler; hata 400/409/404'tür. Delete seansları instance save ile ayırır, not/ölçüm geçmişini korur ve session sürümünü ilerletir. Metadata last-writer-wins kalır. Date-only ISO UTC olarak korunur; belirsiz tarih reddedilir. goals patch diğer alanları korur.

Giriş/kayıt/profil/parola formları ortak şemaları kullanır; sessionForm.ts görünüm adaptörüdür ve gönderimde ortak seans DTO ayrıca doğrulanır. Gerçek süre sınırı form/API için 1–1440 dakika (kesirli geçerli dakika dahil) olarak birleşti. Üç workspace tek Zod 4.6.7 kullanır; Preferences v1 alanları değişmeden ayrı modüle taşındı.

Temiz npm ci ve npm run check geçti: **18 contracts + 142 backend + 175 frontend = 335 test**, atlanan yok; naming/strict/lint/production build başarılı. Yeni 8 contracts/12 backend/13 frontend regresyonu var. Plan yarışları/detach/sürüm/300 saniye ölçüm koruma/SQL rollback gerçek HTTP ve mkdtemp SQLite üzerinde testli. Yeni form ve geçici HTTP transport testleri gerçek tarayıcı E2E değildir. Bu pakette yeni manuel tarayıcı doğrulaması yapılmadı. Audit hâlâ 12 paket düğümü (5 high/7 moderate/0 critical); major bağımlılık işleri açık.

Gerçek DB'ye test yazması/migration/seed/reset/restore uygulanmadı; schema 006 ve özel snapshot pointer'ları korunur. Tek root dev localhost:3000/API 5002 temiz contracts/Vite başlangıcıyla yeniden açıldı; log /tmp/study-tracker-a19-dev.log. Detay: implementation/2026-10-17-shared-request-contracts.md.

**Sıradaki:** A22 Header bildirim hata/boş ayrımı ve popover klavye/odak; takvim klavye/dokunmatik alternatifleri ve otomatik E2E/WCAG/Lighthouse. A04 ve bağımlılıklar açık. Bütün kaynakların runtime response DTO'su/optimistic metadata'sı veya yeni Plan UI'ı tamamlandı iddiası yoktur.

## A22 Header/takvim ilk paket

Mevcut Headless UI Popover.Group Header odak/Escape/dış etkileşimi yönetir; yeni bağımlılık yok. NotificationsPanel hesap anahtarı/epoch, hata/boş/stale ve son 5 yerel okundu kapsamını taşır. PlannerCalendar boş saatlerde roving tabindex; MoveSessionModal native saat/süre ve dirty alan ayrımı kullanır. Mevcut usePlannerCalendar perform/expectedUpdatedAt/409 motoru korunur. Kaynak read retry açık işlemdir; eski kaynakla yazılmaz. Seans odak referansı ID/gün/saat hücresine göre tutulur; taşınan hücrenin unmount temizliği yeni referansı silemez.

Güncel check **18 contracts + 142 backend + 192 frontend = 352 test**; son odak değişikliği sonrası frontend strict/lint/test/build de geçti. Production fixture yalnız temp SQLite/3001/5003 üzerinde doğrulandı ve temizlendi. Gerçek DB/şema değişmedi; root dev 3000/API 5002 korunur. Gerçek dokunmatik/tam WCAG/Lighthouse/otomatik tarayıcı E2E/DST fold/kısa komşu kart yerleşimi açık. Detay: implementation/2026-10-17-header-and-calendar-accessibility.md.

## A22 kısa kart yerleşimi

calendarGeometry.layoutCalendarCards görsel [top, top+max(28,height)) kesişimlerini gruplar; saatler arasında da aynı sütun dağıtımı uygulanır. Eşit başlangıç ID sırasındadır; serbest sütun yeniden kullanılır. Kart ve gün minimum genişliği ortak grid şablonundan gelir; 160 px/sütun, boş haftalık gün 104 px; gün sonu gutter 36 px. Görsel minimum yükseklik persisted duration değildir. Saniye/milisaniye başlangıcı korunur. 36 px altı resize tutamacı yoktur; native saat/süre yolu kullanılır. Güncel kalite 18 contracts/142 backend/200 frontend = 360 test, strict/lint/build başarılı. Temp fixture snapshot beş seansın tüm kolonlarının korunduğunu doğrular; gerçek DB/şema/dependency değişmedi. Detay: implementation/2026-10-17-calendar-card-layout.md.

## A22 otomatik browser kapısı — 18 Ekim 2026

Kök @playwright/test 1.64.1 dev bağımlılığı/lock; tests/e2e strict tsconfig ve lint/naming kapsamı. npm run check E2E tiplerini de denetler; npm run test:e2e ayrı production build/typecheck/browser kapısıdır. Chromium/WebKit desktop ve Pixel 7 Chromium 412×839 emülasyonunda 6×3=18 yürütme başarılı. Retry/skip yok, aktif pencere odağı için bir worker. CI browser install, E2E ve 7 günlük rapor artifact adımları tanımlı; uzak koşum yapılmadı.

Test başına fresh mkdtemp DB/context/random JWT/loopback portu; child kontrollü env, NODE_ENV=test'te dotenv yüklenmez (143. backend regresyonu). Build API=/api; browser dış origin engeli; static production frontend ve gerçek API, scheduler'sız app girişi. Kapanış integrity/FK/kayıt/ölçüm koruma kontrolü ve temp cleanup yapar. Gerçek DB/schema 006 değişmez. Taşıma odağı onClose RAF'ından closed-dialog effect'ine taşındı; pending/unmount iptali var. Final kalite 361 workspace + 18 E2E, ayrıca 18 odak tekrar yürütmesi başarılı. Tam WCAG/Lighthouse/DST fold/fiziksel cihaz/yük ve bütün admin/Pomodoro E2E kapsamı açık. Ayrıntı: implementation/2026-10-18-isolated-browser-tests.md; komutlar: tests/e2e/README.md.

## A22 automated accessibility and Lighthouse — 18 Ekim 2026

Root dev bağımlılıkları @axe-core/playwright 4.14.0 ve Lighthouse 13.5.0 exact pin/lock; Playwright 1.64.1 korunur. `npm run test:e2e` 36 yürütme/150 axe taraması, `npm run test:lighthouse` ayrı config/dizinle dört ölçüm; `--repeat-each=3` medyan için 12 koşu üretir. Strict tsconfig iki Playwright config'ini de içerir; generated Lighthouse dizinleri Git/ESLint dışıdır. CI timeout 20 dakika, ölçüm/rapor artifact'i tanımlı; uzak koşum yapılmadı.

Son clean install/check: 361 workspace testi, strict/naming/lint/build; browser 36/36, axe 150/0 violations (default + açık WCAG 2.2 target-size), Lighthouse 12/12. Accessibility100; performans medyan login 96/67 ve dashboard 92/61 (desktop/mobile). Mobil 90+ açık. Incomplete kayıtlar filtrelenmez; test sonuçları tam WCAG/ekran okuyucu veya gerçek dağıtım başarısı değildir. Lighthouse auth/CDP ve fixture koşulları, ham raporlar ve açık performans/cleanup sınırları implementation/2026-10-18-accessibility-and-lighthouse.md içindedir. Audit 12 (5 high/7 moderate) sürer; runtime/şema 006 değişmedi.
