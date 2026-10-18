# A22 — Isolated browser journey tests

18 Ekim 2026. Kullanıcı kaldığımız yerden devam istedi. Bütün memory-bank ve güncel kaynak okundu; başlangıç ağacı 121e222 üzerinde temizdi. Önceki A19/A21 ve iki A22 paketi korunur. Bu paket ilk otomatik gerçek tarayıcı E2E kapısını ekler; tüm A22 veya üretime hazır olma iddiası değildir.

## Uygulama

- Kök dev bağımlılığı `@playwright/test` 1.64.1'e sabitlendi; Node 24 ile engine uyumu npm registry'den, fixture/project/CI yolu resmî dokümanlardan kontrol edildi. Üç workspace'in runtime/major bağımlılıkları değiştirilmedi. Lock'taki bilinen 12 düğümlük audit backlog'u (5 high/7 moderate) sürer.
- `npm run test:e2e` üretim contracts/backend/frontend build ve E2E strict typecheck yapar, sonra altı senaryoyu masaüstü Chromium, masaüstü WebKit ve Pixel 7 Chromium emülasyonunda yürütür. Pixel viewport 412×839 CSS px; bu fiziksel Android/iOS veya kurulu Safari testi değildir.
- `tests/e2e/fixtures.ts` her test için yeni browser context, boş sahip olunan mkdtemp dizini ve ayrı child kurar. Child kendi random JWT, sentetik iki hesap, SQLite, yedek dizini ve 127.0.0.1 üzerinde OS portu kullanır. Önceden çalışan sunucu/base URL/gerçek DB yolu yeniden kullanılmaz.
- Üretim frontend API yolu build sırasında `/api` olarak zorlanır. Browser route guard kendi fixture origin'i dışındaki istekleri engeller. Auth gerçek form/API/cookie üzerinden yürür; token/state enjeksiyonu yoktur. Bildirim hata senaryosundaki kontrollü 503 dışında başarı/409 yanıtları taklit edilmez.
- Backend `NODE_ENV=test` iken yerel `.env` yüklemez. Yeni child-process regresyonu dotenv yüklemesinin hiç çağrılmadığını doğrular; normal development/production davranışı korunur. Test child ortamı kontrollüdür; macOS temp yolunun parent ve child'da aynı olması için TMPDIR açık taşınır.
- Kapanışta integrity/FK, değişmemesi gereken beş kaynak seansın bütün kolonları, 300 saniyelik interval geçmişi ve taşınan seans notu karşılaştırılır. Hata durumunda da child kapanır, finally temp veriyi kaldırır. Cleanup/koruma kontrolü hata verirse E2E başarısızdır. OS hard kill cleanup finally garantisi değildir; gerçek veriye erişim yine yoktur.
- Test kaynakları strict TS/ESLint/ASCII kapsamındadır. Üretilen HTML/trace/screenshot dizinleri Git ve ESLint dışındadır; kaynaklara yeni ignore/any/skip ile hata bastırma eklenmedi. Forbid-only açık, retry kapalı. Pencere odağı assertion'ları başka pencereyle yarışmasın diye bir worker vardır.
- CI mevcut kalite zincirine browser install, E2E ve 7 gün saklanan rapor/trace artifact adımlarını ekler. Uzak GitHub koşumu yapılmadı; yerel başarı onun yerine geçmez.

## Senaryolar

1. Gerçek giriş, HttpOnly/SameSite cookie, reload bootstrap, aynı browser context'te ikinci hesap ve eski özel verinin görünmemesi.
2. UI'dan özel seans create → native saat/süre değişimi → expectedUpdatedAt/sunucu ack → reload kalıcılığı.
3. İki sekmede aynı sürüm; ikinci sekme save → ilk sekmede gerçek 409 → dirty taslak korunması → otomatik write retry olmadan açık onay → güncel sürüm/not ile başarı.
4. Bir dakikalık komşu/iptal kartların en az 24 px ve çakışmayan hedef sınırları; roving saat/Home/Arrow/Enter/editör/Escape ve 23:59 odak.
5. Completed bildirim sorgusunda 503/hata-boş ayrımı; gerçek API retry, yerel okundu ve Escape/odak.
6. Responsive menü tap/Escape/focus/link kapanışı; mobil günlük varsayılan ve sayfa yatay taşması.

## Bulunan odak yarışı

Gerçek tarayıcı testleri, MoveSessionModal kapanışından önce onClose içinden planlanan tek RAF'ın React commit ve Headless UI passive cleanup'ıyla yarışabildiğini gösterdi. `PlannerCalendar` artık geri dönülecek seans ID'sini ref'te tutar; moving kapalı/pending false commit'inden sonraki effect RAF'ı odağı güncel kart/Bugün düğmesine taşır. Effect cleanup bekleyen RAF'ı iptal eder; eski restoreSessionFocus yolu kaldırıldı. Odak beklentileri gevşetilmedi.

Headless UI dialog dış kapsayıcısı sıfır yüksekliğe sahip olabildiğinden test görünürlüğü fixed paneldeki başlık/kontrolden ölçülür. Sekmeye geri dönüş bringToFront ile gerçek kullanıcı adımı olarak modellenir. Bunlar sahte süre beklemeleri veya test retry'sı değildir.

## Son doğrulama

Temiz `npm ci` başarılı. Odak düzeltmesi sonrası `npm run check`: 18 contracts + 143 backend + 200 frontend = **361 workspace testi**, atlanan yok; workspace/E2E strict, naming, sıfır uyarılı lint ve production build başarılı. Ardından `npm run test:e2e`: **18/18 ana matrix yürütmesi** başarılı. İki odak senaryosu üç profilde üçer kez ayrıca tekrarlandı: **18/18**; bu tekrarlar ana test sayısını şişirmek için toplam 379'a ayrıca eklenmez.

Loglar: `/tmp/study-tracker-e2e-clean-install.log`, `/tmp/study-tracker-e2e-final-check.log`, `/tmp/study-tracker-e2e-verified-matrix.log`, `/tmp/study-tracker-e2e-focus-regression.log`. Yerel HTML raporu `playwright-report/index.html`, generated artifacts `test-results/` içindedir; Git dışındadır. Son fixture süreç/temp dizin temizliği ayrıca denetlendi. Başarısız geliştirme koşularında da temp dizin kalmadığı gözlendi. CI uzak koşumu yapılmadı.

Test komutları, kaynaklar ve kapsam `tests/e2e/README.md` içindedir.

## Açık sınırlar

Tam WCAG/ekran okuyucu, Lighthouse, DST fold, fiziksel touch cihazı, native drag/resize ve bütün admin/Pomodoro faz akışlarının otomatik E2E kapsamı açık kalır. A04 offsite/retention/yük/kurtarma ve major bağımlılık işleri kapanmaz. Yeni API/migration, kullanıcı DB'sinde test yazması/seed/reset/restore veya gerçek admin parolası okuma/değişimi yoktur. Commit/push/deployment yapılmadı.

Resmî kaynaklar: [Playwright fixtures](https://playwright.dev/docs/test-fixtures), [projects](https://playwright.dev/docs/test-projects), [CI](https://playwright.dev/docs/ci-intro), [upload-artifact v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2). Test başına geçici sunucu ve `.env` izolasyonu bu projenin kararıdır.

Yerel kapanış: mevcut dev dinleyicisi bulunmadığından tek root `npm run dev` başlatıldı. Frontend localhost:3000 HTTP 200, API 5002 health OK; port başına tek servis var. Log `/tmp/study-tracker-e2e-dev.log`. Test fixture child veya temp DB dizini kalmadı; gerçek schema 006 korunur.
