# Ders Takip Sistemi — Teknik Bağlam

Kaynak ve doğrulama: 15 Ekim 2026, oturum ve kurtarma paketi. Başlangıç incelemesi tarihsel raporda tutulur; aşağıdaki mevcut durum onun yerini alır.

## Araç zinciri

- npm workspaces: `backend` ve `frontend`; teknik paket adları study-tracker / @study-tracker/backend / @study-tracker/frontend.
- Node 24.21.0 (`.nvmrc`, `.node-version`); npm 11.19.0; engine-strict. Tek kök package-lock.json izlenir ve npm ci kullanılır.
- Vite 8.3.4 / React plugin 6.1.2; ESLint 10.12.0 flat config / typescript-eslint 8.71.2; Vitest 5.0.4; TypeScript 5.9.3'e sabit.
- Backend hâlâ Express 4 + Sequelize 6; sqlite3 6.0.1'e güncellendi. Jest/ts-jest/nodemon/ts-node kaldırıldı; dev/seed tsx 4.23.15 ile çalışır.
- Frontend React 18, Router 6, Zustand 4, Query 5, Axios 1, RHF 7, Zod 3, Tailwind 3, Headless UI 1, Framer Motion 10, Recharts 2. Bu kütüphanelerin tümü son major'a taşınmış değildir; uyumluluk ve güvenlik dönüşümü açık iştir.
- Backend doğrulama Joi 17 + Zod 4; ortak şema henüz yok. express-validator/winston/fs-extra ve frontend tailwind-merge/devtools kullanılmadığı için kaldırıldı. Tailwind plugin'leri devDependencies altında.
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
- `database/migrations.ts` `schema_migrations` tablosuyla `001-initial-schema` ve `002-auth-sessions` migration'larını çalıştırır. Yalnız açık `npm run db:migrate` komutu yazar; transaction içinde non-destructive sync ile ilk tabloları oluşturur, mevcut kayıtları korur.
- Var olan model tablolarında eksik kolon bulunursa özel migration gerekir; sessiz alter uygulanmaz. İlerideki şema değişimleri yeni migration olarak eklenmelidir. İlk baseline genel legacy şema onarım aracı değildir.
- Development seed yalnız development modunda, açık ADMIN_EMAIL/ADMIN_USERNAME ve en az 12 karakterli ADMIN_PASSWORD ile çalışır. findOrCreate + transaction; var olan hesap/parola/kategori sıfırlanmaz, parola loglanmaz.
- Kullanıcı DB'sinde migration/seed/reset/restore test amacıyla çalıştırılmaz. Testler mkdtemp altında kendi SQLite dosyasını oluşturup temizler.

## Modeller ve API

On model: User, Category, Course, Topic, Plan, StudySession, Settings, Backup, AuthSession, RefreshCredential. Veri alanları, tablolar ve lokalize difficulty değerleri bu pakette yeniden adlandırılmadı. Category global; Course kişisel/global; Topic derse; Plan ve StudySession kullanıcıya bağlı. Settings global key/value; User.preferences kişisel JSON.

- Auth: /api/auth/register, /login, /refresh-token, /logout; /me, /profile, /change-password. Access JWT yalnız bellekte; sid/id, açık HS256/issuer/audience doğrulaması ve DB session/aktiflik/rol kontrolü. Refresh opaque credential yalnız hash olarak DB'de; HttpOnly/SameSite Strict cookie, production Secure. Custom X-Requested-With ve origin denetimi var.
- Refresh IMMEDIATE transaction içinde döner; tekrar kullanım bütün aileyi iptal eder, session ömrü mutlak. Logout, parola değişimi/admin kurtarma, rol/aktiflik değişimi iptal uygular. Yeni parolalar 12 karakter/en fazla 72 UTF-8 bayt. Login/parola değişimi stale hash yarışını transaction içinde denetler.
- admin:manage CLI yalnız var olan/hazır DB ve private password file ile create/recover yapar; create admin yokken, recover tam e-posta ile aktif admin için çalışır. Öğrenci yükseltmez, parola loglamaz. Testler geçici DB'dedir.
- Course görünürlüğü `policies/courseAccess.ts`: sahibi veya global veya admin. Liste, tek ders, dersin konuları ve topic parent join'leri bu scope'u kullanır. User detail kendisi/admin ile sınırlı.
- Yeni StudySession ilişkisinde plan sahibi, ders/konu görünürlüğü, aktiflik ve topic-course eşleşmesi doğrulanır. Yalnız topic verilirse erişilebilir parent course çözülür.
- GET StudySession yan etkisizdir; not veya durum güncellemez. Zaman aşımı politikası henüz ayrı service olarak uygulanmadı.
- Create çakışma kontrolü atomik değil; update çakışma/durum ve gerçek süre konuları açık. Eski hatalı ilişkiler bu oturumda gerçek DB'de taranmadı.
- Settings GET hâlâ public; public/admin DTO ayrımı ve ayarların uygulanması açık. Backup route'ları admin; native SQLite backup API, dosya dışı manifest/SHA-256/integrity/FK/şema kontrolü, güvenlik yedeği/atomik destination restore/rollback ve bakım kapısı uygulanmıştır. settings_only/all reset transaction'lıdır. Her 5 dakikadaki job ayarı yeniden okuyarak 1/5/7 tam gün hesabı yapar. Tek backend süreci sınırı, offsite/kapasite/retention işleri açık; otomatik yedek silme yoktur.
- Merkezi hata handler Sequelize ValidationError→400, Unique/FK→409; beklenmeyen hata mesajı istemciye verilmez. Eski MongoDB hata eşlemeleri kaldırıldı. Joi/Zod/manual validation birleştirilmedi.

## Güncel görsel sistem (15 Ekim 2026)

Kalıcı tasarım kararı `design-system.md` içindedir; önceki iOS/pastel yaklaşım geçersizdir. CSS semantik açık/koyu token'ları, ortak PageHeader ve panel/kontrol sınıfları kullanılır. Geist Variable 5.3.0 self-hosted; Google Fonts linkleri kaldırıldı. canvas-confetti/@types kaldırıldı. Mobil navigasyon Headless UI Dialog, Framer Motion reducedMotion=user; CSS reduced-motion var. Ortak calendarViewport ölçülen satır konumuyla 08:00'e ilk kaydırmayı yapar.

Tasarım paketi kapanışında: 22 backend + 8 frontend = 30 test (tarihsel), strict typecheck/lint/build. Dolu geçici DB ile masaüstü/390×844 mobil görsel ve etkileşim kontrolleri yapıldı; otomatik E2E/WCAG değildir. Dashboard konu sayımı ve son aktivite sıralaması düzeltildi. A11 Preferences sync 400 tarayıcıda tekrar doğrulandı; yerel tema değişmesi sunucu kalıcılığı anlamına gelmez.

## Frontend

- App sayfaları lazy import ve Suspense ile yükler. ErrorBoundary kökte; hata halinde Türkçe kurtarma ekranı gösterir, iç hata detayını kullanıcıya açmaz. Source map build'de kapalı.
- QueryClient `src/lib/queryClient.ts` altında. Auth store kimlik değişiminde cache'i ve eski sorguları temizler; late response izolasyonu testlidir. Query key'ler henüz kullanıcı/tarih factory'sine taşınmadı; tercihler ve readNotifications kullanıcıya göre scope edilmedi.
- Auth tek bellek kaynağı/refresh promise ve epoch ile yürür; geç yanıtlar bitmiş veya değişmiş hesabı geri getiremez. Geç 401 güncel token ile tekrar edilir. Cookie değişiklikleri ayrı Axios transport ve Web Locks ile sıraya konur; BroadcastChannel diğer sekmelerin cache/kimliğini temizler. Çevrimdışı logout için gizli bilgi taşımayan pending niyeti tutulur; reload bu durumda refresh yapmaz. Eski auth-storage temizlenir.
- Preferences frontend/Joi/model sözleşmeleri uyumsuz; kayıt başarısı varsayılmamalı.
- WeeklyPlanner/DailyCalendar ayrı işlem mantıkları; PomodoroPage/PomodoroTimer iki motor. Bunlar sonraki birleştirme işidir.
- Yedi erişilemeyen modül kaldırıldı: AdminScheduleManager, CourseManagementModal, AddTopicModal, EditTopicModal, GoalSettingModal, AdminCategoriesPage ve pages/courses placeholder. Kullanılan ders sayfası pages/CoursesPage.tsx.
- Grafik verisinin dahili saat/dakika anahtarları hours/minutes; Türkçe tooltip/içerik korunuyor. Login'deki sabit demo hesap listesi kaldırıldı.

## Kontroller ve kanıt

- `npm run setup`: npm ci → configure → build; DB'ye yazmaz.
- `npm run check`: ASCII teknik adlandırma → iki workspace typecheck → sıfır uyarılı lint → testler → build.
- TypeScript strict/optional/no-unused ayarları gevşetilmedi. ESLint temel JS/TS doğruluk ve unused kurallarını, hooks rules-of-hooks kuralını uygular. Mevcut any borcu veya bütün hooks/exhaustive-deps sorunları kapatılmış değildir; disable yorumuyla bastırma eklenmedi.
- Güncel check: **43 backend + 14 frontend = 57 test**, atlanan yok; strict typecheck, sıfır uyarılı lint ve iki production build başarılı. Backend WAL/restore/rollback ve oturum yarışları, frontend gerçek HTTP transport ile eşzamanlı/geç 401 dahil.
- Yerel yeni admin ile giriş, reload/cookie bootstrap ve manuel snapshot tarayıcıda doğrulandı; gerçek DB'de reset/restore/seed yapılmadı.
- İlk paket tarihsel doğrulaması — Backend Node test runner + Supertest: 22 test; gerçek HTTP/geçici SQLite, env, hata response'ları ve migration/snapshot yolu. Frontend Vitest/Testing Library/jsdom: 5 test; ErrorBoundary ve hesap cache sınırı.
- GitHub Actions checkout/setup-node v7 + npm ci + check tanımlı; GitHub'da koşum yapılmadı.
- Production bundle tarayıcı smoke: geçici hesapla login/dashboard/haftalık/günlük planner. Fixture sunucusu/DB temizlendi. Tam E2E veya mobil/erişilebilirlik testi değildir.
- İlk paketin tarihsel statik bundle grafiği (tasarım sonrası yeniden ölçülmedi): boot JS 424.182 B / gzip 142.359 B; login ile 519.151 / 168.708 B. Rota chunk'ları ayrıca yüklenir; ağ/Lighthouse ölçümü değildir.
- İlk paketin lock audit sonucu: 12 etkilenen paket düğümü, 0 critical / 5 high / 7 moderate. Kalan grafik/router/css/Sequelize zinciri açık; production exploit olarak doğrulanmadı.

Ayrıntılar `implementation/2026-10-15-security-and-recovery.md`, tarihsel temel `implementation/2026-10-15-foundation.md`, kalan işler `progress.md`, kalıcı kurallar `workingPrinciples.md` içindedir.
