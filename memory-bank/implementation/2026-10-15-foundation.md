# İlk İyileştirme Paketi — 15 Ekim 2026

## Yetki ve kapsam

Kullanıcı, teknik incelemedeki önerilerin uygulanmaya başlanmasını ve kod/dosya/klasör adlarının İngilizce olmasını istedi. Bu paket geliştirme tabanını ve bazı kritik erişim/veri güvenliği sorunlarını ele alır. Bütün A01–A22 bulgularının çözümü veya production dağıtımı değildir.

İlk incelemenin kaynak commit'i `90e13cc` idi. Önceki dokümantasyon değişiklikleri korundu; commit/push yapılmadı. Uygulama ve test dosyaları İngilizce adlarla oluşturuldu. Türkçe UI/veri değerleri çevrilmedi; grafik içi saat/dakika alanları kalıcı veri olmadığı için hours/minutes olarak adlandırıldı.

## 1. Tekrarlanabilir geliştirme

- Node 24.21.0 ve npm 11.19.0; `.nvmrc`, `.node-version`, engine-strict ve packageManager alanı.
- Kök package-lock.json artık ignore edilmiyor; npm workspace'leri tek kurulumla yönetiliyor.
- `npm run setup`: kilitli kurulum → yalnız eksikse güvenli yerel env oluşturma → build. DB yazmaz.
- `npm run configure` rastgele bağımsız JWT anahtarları üretir; `.env` dosyasını 0600 ve `wx` ile oluşturur. Var olan dosyayı değiştirmez.
- Vite 5→8.3.4 / plugin-react 6.1.2; ESLint 8→10.12.0 / typescript-eslint 8.71.2.
- sqlite3 5→6.0.1; eski node-gyp/tar kurulum zinciri kaldırıldı. Native script izinleri root allowScripts içinde sürüme bağlıdır.
- Jest/ts-jest ve boş test komutu kaldırıldı; backend Node test runner/Supertest kullanır. Nodemon/ts-node yerine tsx 4.23.15. Frontend Vitest 5.0.4/Testing Library/jsdom kullanır.
- TypeScript 5.9.3 sabit; React 18/Recharts 2/Router 6/Tailwind 3 uyumluluk geçişleri sonraki iştir. Bütün paketlerin en yeni sürüme geçtiği iddia edilmez.

## 2. Derleme ve kod tabanı temizliği

Frontend'in 50 TypeScript hatası strict, exactOptionalPropertyTypes veya unused kontrolleri kapatılmadan giderildi. Eksik canvas-confetti tipleri eklendi; gerçek optional alan kontrolü yapıldı. Kullanılmayan import/parametre ve anlamsız atamalar temizlendi; ESLint disable/ts-ignore eklentisi kullanılmadı.

Statik import taramasıyla erişilemediği doğrulanan yedi modül kaldırıldı: AdminScheduleManager, CourseManagementModal, AddTopicModal, EditTopicModal, GoalSettingModal, AdminCategoriesPage, pages/courses/CoursesPage placeholder. Eski JS seed/setup/database-setup, debug/drop/list script'leri, debug çıktısı, geçersiz MongoDB geliştirme prompt'u ve hesap listesi kaldırıldı. Kaynak geçmişi Git'te kalır.

Kullanılmayan express-validator/winston/tailwind-merge/devtools kaldırıldı; Tailwind build plugin'leri devDependencies'e taşındı. Login'deki eski sabit demo hesap bilgileri kaldırıldı.

## 3. Sunucu ve şema yaşam döngüsü

`app.ts` HTTP uygulamasını dışa aktarır; import etmek listen/cron başlatmaz. `index.ts` DB ve schema doğrulaması, listen/cron ve kontrollü kapanış sorumluluğunu taşır. Bu ayrım gerçek HTTP testlerini kullanıcı DB'sinden bağımsız hale getirir.

Merkezi environment şeması eksik/zayıf/örnek/eşit JWT anahtarlarını reddeder; sabit fallback yok. Süre, port, HTTP(S) origin ve rate limit değerleri doğrulanır. CORS FRONTEND_URL'den gelir; varsayılan API portu 5002'dir. Anahtar/değer içerikleri tanı mesajlarına kopyalanmaz.

Sunucu açılışındaki tablo silme ve sync kaldırıldı. Explicit `db:migrate`, schema_migrations içinde `001-initial-schema` baseline'ını kaydeder. Uyumlu mevcut tablolar korunur, eksik kolon için özel migration gerekir. Baseline transaction kullanır; future model değişimini otomatik alter etmez. Gerçek user DB'sinde bu komut çalıştırılmadı.

Development seed yalnız development modunda açık admin kimliği/parolasıyla çalışır; parolayı loglamaz. Yeni hesap/kategori için findOrCreate ve transaction kullanır. Bu pakette CLI seed gerçek veride çalıştırılmadı; idempotentlik davranışı kaynak düzeyinde değerlendirildi, mevcut verinin tüm çeşitleriyle göç provası yapılmadı.

## 4. Erişim ve veri güvenliği düzeltmeleri

- Ortak `visibleCourseWhere`: sahibi veya global veya admin. Liste/detay/konu parent join'leri bu politikayı kullanır.
- `/users/:id` self/admin ile sınırlı; yabancı kaynak için 404.
- Yeni oturumda plan sahipliği yanında ders/konu görünürlüğü, aktiflik ve topic-course eşleşmesi doğrulanır. ID'ler pozitif tam sayı olmalıdır. Yalnız topic seçilirse görünür parent course çözülür.
- GET oturum listesi artık durumu/notları değiştirmez. Otomatik zaman aşımı politikası yeni bir işlem/service olarak tasarlanmalıdır; frontend'in eski “backend iptal edecek” yorumları sonraki planner refactor'unda güncellenmelidir.
- Request body/params ve bütün ders içeriğini yazdıran debug logları kaldırıldı.
- Error handler eski MongoDB kodları yerine Sequelize validation→400, unique/FK→409 üretir; iç hata metnini istemciye vermez.
- Backup aynı DB_PATH kaynağını kullanır. Geçici DB snapshot'ı açılıp kullanıcı sayısı doğrulandı. Canlı kopyalama/atomik restore/rollback ve reset transaction'ları henüz çözülmedi.
- Cron'a açık timezone ve noOverlap eklendi; `*/5`/`*/7` gerçek aralık sorunu ve ayar değişikliğinde yeniden planlama hâlâ açıktır.

## 5. Frontend yükleme ve hesap sınırı

- Route lazy loading/Suspense; kökte Türkçe kurtarma ekranlı ErrorBoundary. Source map production build'de kapalı.
- QueryClient tek modülde; auth kimliği değişince cache ve in-flight sorgular temizlenir. İkinci hesabın verisinin geç gelen birinci hesap sorgusuyla ezilmediği test edildi.
- Bu cache düzeltmesi kullanıcı/tarih query key factory'si, kişisel preferences/readNotifications saklama veya refresh state yarışlarının bütün çözümü değildir.
- API varsayılanı `/api`; development Vite proxy ve production reverse proxy ile aynı origin akışına uygun.

## 6. Doğrulama

Temiz `npm ci` başarılı oldu. Sonrasında `npm run check` ile adlandırma, iki workspace'in typecheck'i, sıfır uyarılı lint, testler ve production build çalıştırıldı.

Backend 22 test: gerçek HTTP + geçici SQLite üzerinden owner/other/admin matrisi, login/issued token, ilişki doğrulama, yan etkisiz GET, non-destructive bağlantı/migration tekrarı, doğru snapshot yolu; ayrıca env ve güvenli DB hata yanıtları.

Frontend 5 test: sağlıklı/crash durumunda ErrorBoundary; hesap değişimi/logout ve eski yanıtın yeni cache'i ezmemesi. Testler atlanmadı. GitHub CI workflow eklendi; uzak GitHub koşumu yapılmadı.

Production build, kullanıcı DB'sinden bağımsız geçici backend/hesapla tarayıcıda açıldı. Giriş → dashboard → haftalık/günlük planner doğrulandı. Bu kontrol boş fixture ile masaüstü smoke testidir; görev taşıma, gerçek çalışma süresi, mobil/klavye veya tam tarayıcı E2E kapsamı değildir. Geçici sekme/sunucu kapatıldı ve DB temizlendi.

### Paketleme ölçümü

Minified JS'in statik import grafiği izlendi; her dosyanın gzip boyutu ayrı hesaplandı. Aktif route'un dinamik yükü ayrıca dahil edildi.

| Kapsam | JS bayt | Gzip bayt |
|---|---:|---:|
| Ana giriş, statik importlar | 424.182 | 142.359 |
| Ana giriş + login route | 519.151 | 168.708 |
| Ana giriş + dashboard route | 816.755 | 247.417 |

Başlangıçta bütün sayfaları içeren tek JS dosyası 1.367,31 kB / gzip 381,61 kB idi. Bu yeni sonuçlar network/Lighthouse ölçümü değildir; cache, sunucu sıkıştırması ve sonraki sayfa yükleri ayrıca etkiler. Ana entry dosyasının tek başına küçülmesini bütün ilk ekran yükü olarak sunmamak gerekir.

### Bağımlılık audit'i

Güncel lock üzerinde npm audit: **12 etkilenen paket düğümü; 0 critical, 5 high, 7 moderate**. Başlangıç audit'i ayrı manifest çözümlemelerinden geldiği için doğrudan yüzde karşılaştırması yapılmaz. Paket düğümü, benzersiz CVE veya doğrulanmış saldırı sayısı değildir.

Açık doğrudan kaynaklar: @tailwindcss/typography, Tailwind, react-router-dom, Sequelize; transitive UUID ve CSS/glob zincirleri. Eski React/Recharts ve diğer major dönüşümleri de açıkça takip edilir. Uyum testleri olmadan zorlayıcı audit fix uygulanmadı.

## Devam koşulları

Bir sonraki paket auth refresh/logout/parola iptali ve güvenilir backup/restore/reset üzerinde çalışmalıdır. Oturumun atomik çakışma/durum/gerçek süre modeli, Preferences/timezone ve tek planner/timer motoru ayrı kabul kriterleriyle devam eder. Güncel bulgu tablosu progress.md içindedir.

Kullanıcının mevcut ortamı/verisi üzerinde migration/seed/reset/restore ve gerçek hesap/anahtar değişimi yapılmadı. Commit/push/deployment yapılmadı. Bu sınırlar tamamlanmış işlerden ayrı tutulmalıdır.
