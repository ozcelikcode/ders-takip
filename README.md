# Ders Takip Sistemi

Ders, görev ve çalışma oturumlarını planlayan Türkçe web uygulaması. Teknik adlandırma İngilizcedir; kullanıcıya görünen içerik Türkçe kalır.

## Geliştirme gereksinimleri

- Node.js 24.21.0 (`.nvmrc` / `.node-version`).
- npm 11.19.0; tek paket yöneticisi ve kökteki `package-lock.json` kullanılır.
- npm workspaces: `packages/contracts`, `backend` ve `frontend`.

```bash
nvm use
npm install --global npm@11.19.0
npm run setup
```

`setup`, kilitli bağımlılıkları kurar, mevcut dosya yoksa rastgele JWT imzalama anahtarı içeren yerel `backend/.env` oluşturur ve iki uygulamayı derler. Mevcut ortam dosyasına ve kullanıcı verilerine dokunmaz. Yapılandırma dosyası Git'e eklenmez.

Veritabanı ilk kurulumda **ayrı ve açık** bir komutla hazırlanır:

```bash
npm run db:migrate
npm run dev
```

- Frontend: [localhost:3000](http://localhost:3000).
- API: [localhost:5002/api/health](http://localhost:5002/api/health).
- Frontend `/api` çağrılarını Vite proxy üzerinden backend'e iletir.
- Sunucu açılışı şema oluşturmaz, değiştirmez veya tablo silmez. Bekleyen migration ya da uyumsuz şema varsa başlangıç durur.
- İlk migration mevcut uyumlu tabloları ve kayıtlarını koruyarak baseline oluşturur; `002-auth-sessions` iptal edilebilir oturum tablolarını, `003-user-preferences-v1` ortak tercih JSON sözleşmesini ekler. Eksik kolon içeren eski şema otomatik onarılmaz; bunun için ayrı migration gerekir.

## Yapılandırma

Örnekler: [backend/.env.example](backend/.env.example), [frontend/.env.example](frontend/.env.example).

| Alan | Anlamı |
|---|---|
| `JWT_SECRET` | Rastgele, en az 32 karakter; eksik, kısa veya örnek anahtarla uygulama başlamaz. |
| `JWT_EXPIRE` | Access token süresi, en fazla 15 dakika; varsayılan `15m`. |
| `SESSION_TTL_DAYS` | Oturumun uzatılmayan mutlak ömrü; 1–30 gün, varsayılan 7. |
| `BCRYPT_SALT_ROUNDS` | Yeni parola hash maliyeti; 12–16, varsayılan 12. |
| `PORT` | Varsayılan 5002. |
| `FRONTEND_URL` | İzin verilen tarayıcı origin'i; varsayılan `http://localhost:3000`, production'da HTTPS zorunlu. |
| `DB_PATH` | Mutlak yol veya backend klasörüne göre göreli SQLite yolu; varsayılan `database.sqlite`. |
| `BACKUP_DIR` | Mutlak yol veya backend klasörüne göre göreli yedek dizini. |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | Production API sınırı; varsayılan 15 dakikada 100 istek. |
| `VITE_API_BASE_URL` | Varsayılan `/api`; ayrı origin kullanılacaksa frontend build öncesi tanımlanır. |

Production dağıtımında geliştirme ortam dosyası yerine ortam değişkenleri sağlanır. Frontend `/api` yolu dağıtımın reverse proxy'si üzerinden backend'e yönlendirilmelidir. Geliştirme sunucusu production hosting olarak kullanılmaz.

## Yerel admin oluşturma ve kurtarma

Önce migration çalıştırın. En az 12 karakter, en fazla 72 UTF-8 bayt olan güçlü parolayı yalnız sahibinin okuyabildiği bir dosyaya kaydedin (`chmod 600`). Parolayı komut argümanına, sohbet veya Git'e yazmayın. Örneğin Git dışında tutulan `.local/admin-password.txt` dosyasıyla:

```bash
npm run admin:manage -- --mode create --email admin@example.com --username admin --password-file /absolute/path/to/admin-password.txt
```

`create`, yalnız henüz hiçbir admin yoksa çalışır. Unutulan mevcut admin parolası için aynı komutta `--mode recover` ve hesabın tam e-posta adresi kullanılır. Kurtarma yalnız aktif admin hesabına uygulanır; öğrenciyi admin yapmaz, diğer kullanıcıları değiştirmez, hesabın bütün oturumlarını iptal eder. Araç veritabanı yoksa durur; sessizce yeni dosya veya örnek veri üretmez.

15 Ekim 2026'da kullanıcının açık talimatıyla bu çalışma klasöründe ilk yerel kurulum ve `admin@example.com` hesabı oluşturuldu. Rastgele parola `.local/admin-password.txt` içinde 0600 izinle tutulur; dosya Git dışında kalır. Bu hesap örnek veya production için varsayılan parola sağlamaz.

## Oturum sözleşmesi

Access token yalnız uygulama belleğindedir. Refresh credential yalnız `HttpOnly`, `SameSite=Strict`, `/api/auth` kapsamlı cookie ile taşınır; production'da `Secure` zorunludur. Refresh her kullanımda döner, tüketilmiş credential tekrar kullanılırsa bütün oturum ailesi iptal edilir. Logout o oturumu; parola değişikliği ve admin kurtarma ilgili kullanıcının bütün oturumlarını kapatır. Rol/aktiflik değişikliği de eski oturumları iptal eder.

`/api/auth` istekleri `X-Requested-With: StudyTracker` başlığı ve tarayıcıda `credentials: include` gerektirir. Origin kontrol edilir. Arayüz istemcisi bunları uygular; aynı anda gelen 401 yanıtları ortak refresh kullanır, geç yanıtlar hesap değişimini geri alamaz. Modern tarayıcılarda Web Locks sekmeler arasında cookie işlemlerini sıraya koyar; BroadcastChannel diğer sekmelerin kimlik/cache durumunu temizler. Çevrimdışı çıkış niyeti sonraki açılışta otomatik giriş yapılmasını engeller.

Bu değişiklik eski JSON refresh-token sözleşmesinin yerini alır. Mevcut kurulumlarda backend/frontend birlikte güncellenmeli, `npm run db:migrate` uygulanmalı ve kullanıcılar yeniden giriş yapmalıdır. `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRE` artık kullanılmaz.

## Yedekleme ve kurtarma

Yönetim ekranı canlı SQLite dosyasından native Online Backup API ile tutarlı snapshot oluşturur. Dosyanın bütünlüğü, foreign key'leri, migration/kolon uyumu ve SHA-256 değeri denetlenir. Snapshot ile yanındaki `.sqlite.json` manifest birlikte saklanmalıdır; katalog geri yüklemeden sonra bu manifestlerden yeniden kurulur. Dizin 0700, yeni dosyalar 0600 izinlidir.

Restore önce kaynak doğrulaması ve mevcut verinin güvenlik yedeğini alır, SQLite destination transaction ile geri yükler, şemayı kontrol eder ve eski oturumların tamamını iptal eder. Son kontrol başarısızsa güvenlik yedeğine döner; bu da başarısızsa API bakım durumunda kalır. İşlem sırasında yeni veri istekleri 503/Retry-After alır; sunucu kapanmaz. Manifesti bulunmayan eski kayıtlar arayüzde doğrulanmamış görünür ve geri yüklenemez.

Otomatik yedek kontrolü her 5 dakikada çalışır. Son başarılı otomatik yedekten itibaren 1, 5 veya 7 **tam gün** dolması esas alınır; aralık ayarı her çalışmada yeniden okunur. Yedekler otomatik silinmez. Kapasite takibi, şifreli/ayrı diskte yedek, saklama politikası ve gerçek ortam kurtarma tatbikatı ayrıca kurulmalıdır.

`settings_only` yalnız site ayarlarını sıfırlar. `all`, öğrenci hesapları ve ders/çalışma verilerini temizler; adminleri ve yedekleri korur. İki işlem de önce güvenlik yedeği alır ve silmeleri transaction içinde yürütür. Doğrulama testleri geçici veritabanlarında çalışır. Koordinasyon tek backend süreci içindir; çoklu instance ve harici SQLite yazıcıları bu kilide dahil değildir.

## Site adını ve kimliğini değiştirme

Admin hesabıyla [Site ayarları](http://localhost:3000/admin/settings) → Genel bölümünü açın. Site adı, açıklama, logo URL'si ve ikon seçimini kaydedin. Aynı ad giriş/kayıt, menü, yükleme ekranı ve tarayıcı başlığında; açıklama/ikon ilgili metadata ve favicon'da kullanılır. Türkçe veya başka bir marka adı seçilebilir. Kod/dosya adlarının İngilizce oluşu bu görünen adı sınırlamaz. Repo/paket adı ve hosting domain'i bu ayarla değişmez.

Site kimliği kaydı mevcut ekranda hemen uygulanır; diğer açık ekranlar açılış/focus veya görünürken 60 saniyelik yenilemeyle alır. Gerçek siteye yeni bir ad atanmadı; ekran görüntülerindeki “Odak Atlası” geçici test verisidir.

`GET /api/settings` yalnız public kimlik alanlarını döndürür. Private ayarlar `GET /api/settings/admin` ile admin yetkisi gerektirir; genel okuma ve kalıcı browser cache'inde admin e-postası/güvenlik ayarları bulunmaz. Güncellemeler izinli alan/tip şeması ve tek transaction kullanır. Eski public category ayar okuma yolu kaldırıldı. Kayıt izni/bakım/sessionTimeout gibi kalan ayarların sunucuda uygulanması hâlâ backlog'dadır.

## Kişisel tercihler ve mevcut veriden geçiş

Tema/system seçimi, renk, bildirim tercihleri, çalışma hedef/günleri, timezone ve Pomodoro varsayılanları ortak Preferences v1 sözleşmesiyle kaydedilir. Arayüz sunucu onayı bekler, hata ve devam eden kaydı gösterir. Tercihler sunucuda ve yalnız mevcut hesabın belleğinde tutulur; başka hesaba taşınmaz. Renk override'ı kaldırılınca site rengi kullanılır. Yeni seans formu kişisel Pomodoro varsayılanını alır; mevcut seans ayarı korunur. Bildirim/dil/timezone alanının kaydedilmesi gönderim/çeviri/backend zaman hesabının tamamlandığı anlamına gelmez.

Mevcut kurulumda uygulamayı durdurup tutarlı yedek alın, sonra `npm run db:migrate` çalıştırın ve front/back'i birlikte güncelleyin. `003-user-preferences-v1`, eski workGoals/studyGoals/notifications biçimlerini dönüştürür; kaynak JSON'u DB'de arşivler, kimlik/parola/geçmişi korur. Arşiv API'ye çıkmaz. Gelecekteki bilinmeyen sürüm/bozuk JSON'da migration bütünüyle geri döner. Eski şemalı snapshot güncel restore tarafından reddedilir; uyumlu uygulama veya ayrı kopyada kontrollü migration gerekir.

Kime ait olduğu bilinmeyen eski browser tercih/bildirim değerleri `unassigned-account-state` içinde manuel kurtarma için korunur; hiçbir hesaba otomatik atanmaz. Yeni okundu bildirimleri hesap anahtarlı tutulur. Sorgu cache'i account/resource/date/timezone kapsamındadır; seans yazmaları ilgili bütün özetleri birlikte yeniler.

16 Ekim yerel geçişi private native snapshot sonrasında uygulandı; hesap/parola hash/oturum ve mevcut kayıt sayıları korundu, güncel şema yedeği oluşturuldu. Geçiş öncesi kopyanın yolu Git dışındaki `.local/preferences-upgrade-2026-10-16.json` içindedir.

## Ortak sözleşme geliştirme

`packages/contracts` tek TypeScript kaynaktan Node CJS ve tarayıcı ESM çıktısı üretir. Kök dev/typecheck/test ve workspace build akışları gerekli build'i yapar. Sözleşme export'u değiştiğinde geliştirme süreçlerini yeniden başlatın; Vite `--force` workspace dependency cache'ini yeniler. Backend/shared Zod 4 ile henüz taşınmamış Zod 3 formlarının geliştirme çözümlemesi ayrılmıştır. Birden fazla Vite test sunucusu aynı cache dizinini paylaşmamalıdır.

## Geliştirme verileri

Varsayılan parolalı hesap otomatik oluşturulmaz. Geliştirme ortamında örnek kategorileri ve admin hesabını açıkça oluşturmak için `backend/.env` içine `ADMIN_EMAIL`, `ADMIN_USERNAME` ve en az 12 karakterli `ADMIN_PASSWORD` ekleyin:

```bash
npm run seed
```

Seed yalnız development modunda çalışır. Mevcut hesapların parolasını veya kayıtlarını sıfırlamaz; parolayı loglamaz. Gerçek kullanıcı verilerini test için seed/reset/restore etmeyin.

## Kalite kontrolleri

```bash
npm run check
```

Bu komut teknik adlandırma kontrolü, backend/frontend typecheck, sıfır uyarılı lint, testler ve production derlemelerini çalıştırır. Aynı akış GitHub Actions CI içinde tanımlıdır.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Backend testleri Node test runner, Supertest ve geçici SQLite dosyaları kullanır. Gerçek kullanıcı veritabanına bağlanmaz. Frontend testleri Vitest/Testing Library/jsdom ve refresh eşzamanlılığı için gerçek geçici HTTP transport kullanır. Güncel toplam 5 contracts + 67 backend + 36 frontend = 108 testtir. Bunlar gerçek tarayıcı E2E testlerinin yerine geçmez.

Adlandırma kontrolü dosya/klasör ve kod sembollerinde ASCII dışı adları yakalar. İsimlerin anlam bakımından İngilizce oluşu kod incelemesinde doğrulanır; Türkçe arayüz metinleri bu kontrolün dışındadır.

## Seans yazma sözleşmesi

Seans PUT, start/pause/complete ve DELETE istekleri okunan kaydın `updatedAt` değerini `expectedUpdatedAt` alanında gönderir. Eski sürüm 409 alır; güncel kayıt yeniden okunmalı, değişiklik kullanıcı kararıyla tekrar denenmelidir. Frontend bu alanı taşır ve çakışmada ilgili görünümleri yeniler. Eski açık sekmeler güncellemeden sonra yeniden yüklenmelidir; bu paket DB migration gerektirmez.

Oluşturma/taşıma/boyutlandırma ve iptalden yeniden etkinleştirme atomik transaction içindedir. Çakışmalar 409'dur; bitişe eşit başlangıç geçerlidir. Duraklatılmış/tamamlanmış seanslar aralığını korur, iptal edilmişler boşaltır. Kullanıcı başına tek aktif seans vardır. Tamamlanmış/iptal edilmiş seans açıkça planlanana alınarak yeniden açılır; tekrar tamamlama zaman damgasını değiştirmez. `duration` sunucuda türetilen **plan süresidir**; gerçek çalışma ölçümü ve timezone düzeltmesi sonraki iştir. Ayrıntı: [seans bütünlüğü kaydı](memory-bank/implementation/2026-10-16-session-integrity.md).

## Teknik yapı

```text
packages/contracts/  Ortak Preferences/site kimliği runtime şemaları ve türetilmiş tipler
backend/src/
  app.ts             HTTP uygulaması; import edilmesi sunucu veya cron başlatmaz
  index.ts           Başlangıç, bağlantı kontrolü ve kapanış
  config/            Doğrulanmış ortam ve tek veritabanı yolu
  database/          Açık, sürümlü migration çalıştırıcısı
  policies/          Ortak kaynak görünürlük kuralları
  controllers/       API işlemleri
  middleware/        Auth, doğrulama ve hata katmanı
  models/            Sequelize modelleri ve ilişkileri
  services/          Oturum yaşam döngüsü, admin kurtarma, bakım ve snapshot
  scripts/           Migration, admin yönetimi ve geliştirme seed girişleri
backend/tests/       İzole HTTP/veritabanı ve yapılandırma regresyonları
frontend/src/
  components/        Ortak ve özellik bileşenleri
  lib/               Paylaşılan QueryClient
  pages/             İhtiyaç anında yüklenen sayfalar
  services/          API istemcisi
  store/             Auth, site ayarları ve kişisel tercihler
scripts/             Yerel yapılandırma ve adlandırma kontrolleri
memory-bank/         Kalıcı kararlar, mevcut durum ve teknik inceleme
```

## Mevcut kapsam ve açık işler

Uygulamada kayıt/giriş, ders/konu yönetimi, haftalık/günlük planlayıcı, Pomodoro ve yönetim ekranları bulunur. Oturum iptali, tek süreçli snapshot/restore/reset, Preferences v1, kullanıcı/tarih cache ayrımı değiştirilebilir site kimliği ve atomik seans/durum bütünlüğü uygulandı ve davranış testleriyle doğrulandı. Üretime hazır olma iddiası yoktur. Gerçek çalışma süresi, zaman dilimi, diğer çok adımlı silmeler ve dağıtım/kurtarma operasyonları açık işlerdir.

Güncel ilerleme [memory-bank/progress.md](memory-bank/progress.md), çalışma kuralları [memory-bank/workingPrinciples.md](memory-bank/workingPrinciples.md), başlangıç incelemesi [teknik audit](memory-bank/audits/2026-10-15-project-audit.md) içindedir.
