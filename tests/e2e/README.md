# Browser journey tests

Bu paket üretim frontend derlemesini gerçek Express API, auth/cookie middleware ve SQLite ile çalıştırır. Vitest/Node testlerinin yerini almaz; ana akışlar için ek tarayıcı kapısıdır.

```bash
npm ci
npx playwright install chromium webkit
npm run check
npm run test:e2e
```

Linux CI'da browser sistem bağımlılıkları için `npx playwright install --with-deps chromium webkit` kullanılır. `npm run test:e2e -- --project=chromium-desktop` tek profil çalıştırır. `npx playwright show-report` yerel HTML raporunu, `npx playwright show-trace test-results/.../trace.zip` başarısızlık izini açar.

## İzolasyon ve yaşam döngüsü

- `run.mjs` önce contracts/backend/frontend build ve E2E strict typecheck yapar. Build sırasında `VITE_API_BASE_URL=/api` açıkça atanır; dış API'ye derleme yapılmaz.
- Her test kendi boş `mkdtemp` dizini, SQLite dosyası, rastgele JWT, sentetik iki kullanıcı ve bir admin ve loopback üzerinde işletim sisteminin seçtiği portu alır. Açık geliştirme sunucusu yeniden kullanılmaz. Harici base URL veya DB yolu seçeneği yoktur.
- Child yalnız kontrollü çevreyi alır. Backend `NODE_ENV=test` sırasında `.env` yüklemez. Gerçek admin parolası, kullanıcı DB'si, snapshot veya yedekler okunmaz. Normal seed/reset/restore komutları çağrılmaz; migration yalnız yeni temp DB'ye uygulanır.
- Gerçek auth formundan giriş yapılır; localStorage token veya uygulama state enjeksiyonu yoktur. Browser context yalnız fixture origin'ine istek gönderebilir; dış adresler engellenir.
- Başarı ve hata sonunda süreç kapanır. SQLite integrity/FK, değişmemesi gereken beş seans, not ve 300 saniyelik ölçüm geçmişi karşılaştırılır; cleanup başarısızsa test de başarısızdır. Kapanış gecikirse yalnız test child'ı sonlandırılır; sahip olunan temp dizin finally içinde kaldırılır. İşletim sistemi veya test runner bootstrap sırasında süreci zorla keserse finally güvencesi yoktur; dizin yine yalnız temp test verisi içerir.
- `test-results/` ve `playwright-report/` Git dışındadır; üretilmiş JS raporları lint kapsamına alınmaz, test kaynakları strict/lint/adlandırma kapsamındadır. Trace/rapor yalnız sentetik kimlik bilgisi ve fixture verisi içerebilir. CI artifact saklama süresi 7 gündür.

## Kapsam

27 senaryo (davranış + erişilebilirlik taramaları), masaüstü Chromium, masaüstü WebKit ve Pixel 7 mobil Chromium emülasyonunda çalışır: toplam 81 yürütme (23 Ekim 2026). Mobil profil 412×839 CSS px ve touch girdisi kullanır. Gerçek Android/iOS cihaz veya kurulu Safari doğrulaması değildir. Her senaryo yeni DB/context alır; testler sıra bağımsızdır, otomatik retry ve skip yoktur. Aktif pencere odak assertion'ları için tek worker kullanılır; birbirinden bağımsız tarayıcı pencereleri aynı anda odak için yarışmaz.

1. Gerçek giriş, HttpOnly/SameSite cookie ile reload ve aynı browser context'te ikinci hesabın veri izolasyonu.
2. UI'dan özel seans oluşturma, sürümlü saat/süre değiştirme, sunucu yanıtı ve reload kalıcılığı.
3. İki sekmede aynı snapshot: ikinci sekme kaydı, ilk sekmede gerçek 409, dirty taslağın korunması ve yalnız açık yeniden onayla başarılı retry/not korunması.
4. Kısa/iptal komşu kartların 24 px hedefleri ve çakışmayan piksel sınırları; klavye boş saat gezinmesi/editör/Escape; son dakika odak çerçevesi.
5. Bildirim sorgusunda tek kontrollü 503 hata enjeksiyonu, hata/boş ayrımı, gerçek API'den tekrar okuma, yerel okundu ve odak dönüşü. Diğer başarılı API yanıtları taklit edilmez.
6. Responsive gezinme, mobil menü tap/Escape/odak/bağlantı ile kapanma, günlük varsayılan ve sayfa yatay taşma kontrolü.

Dialog dış kapsayıcısı `relative` olup sıfır yüksekliğe sahip olabilir; görünürlük onun fixed panelindeki başlık/kontrollerden doğrulanır. İki sekme senaryosunda kullanıcı dönüşü `bringToFront` ile modellenir; WebKit'te arka plandaki sekmenin odak etkinliği başarı sayılmaz. Beklemeler gözlemlenen yanıt/DOM/odak durumlarına dayanır, eşitleme için sabit sleep kullanılmaz; tek istisna Pomodoro senaryosunda ölçülecek sürenin geçmesi için bilinçli bekleme (3 sn + 2 sn). Bu paket gerçek tarayıcıda bulunan taşıma sonrası odak yarışını da kapsar: odak dönüşü kapalı dialog commit'inden sonraki effect içinde planlanır ve unmount'ta iptal edilir.

Otomatik tarama tam WCAG/ekran okuyucu uygunluğu değildir. Pomodoro başlat/duraklat/yenile/devam/tamamla ve panodaki ölçülen süre E2E'dedir (sunucu sayacı yenilemede aynı kalan süreyle döner; seed'in 300 sn'sine yalnız çalışan süre eklenir). Yönetici: kullanıcı oluşturma → yeni hesap girişte kurulum sihirbazına düşer → pasifleştirme → giriş "Hesabınız deaktif durumda…" ile reddedilir; site adı kaydı girişsiz sayfanın başlığına ve markasına yansır; yönetici yapılan hesap yönetim sayfasına erişir, silinen hesap "E-posta veya şifre hatalı" alır; yöneticinin eklediği ortak kategori kullanıcının kayıt formunda çıkar. DST fold, gerçek touch cihazı, native drag/resize, Pomodoro faz geçişleri (mola/döngü) ve kalan admin işlemlerinin (kategori silme/taşıma, yedek geri yükleme/sıfırlama) E2E kapsamı açıktır. Fixture teardown'u yalnız seed seanslarının ölçüm aralıklarının değişmediğini denetler. Mevcut unit/API regresyonları bu alanların kendi kanıt sınırlarıyla korunur. CI workflow güncellenir; uzak koşum ayrıca doğrulanmalıdır.

Resmî dayanaklar: [Playwright fixtures](https://playwright.dev/docs/test-fixtures), [projects](https://playwright.dev/docs/test-projects), [CI](https://playwright.dev/docs/ci-intro). Ortak sabit webServer yerine test başına fixture kullanılması bu projenin veri izolasyonu kararıdır.

## Accessibility and Lighthouse

`npm run test:e2e` ayrıca axe-core taramalarını üç profilde çalıştırır. Açık/koyu temaların her birinde public/öğrenci sayfaları, açık profil/parola/kişisel ayar bölümleri, günlük takvim/taşıma/Pomodoro editörü ve admin sayfaları/site ayar bölümleri taranır. axe varsayılan kuralları ve açıkça etkinleştirilmiş WCAG 2.2 target-size çalışır; exclude/disableRules veya kabul edilmiş ihlal baseline'ı yoktur. Bütün violations başarısızlıktır; incomplete sonuçlar JSON'da ayrıca saklanır ve manuel inceleme ister. Görünürlük, veri yüklenmesi, font ve sonlu animasyonlar beklenir; hata ekranı başarı diye taranmaz.

```bash
npm run test:e2e -- accessibility --project chromium-desktop
npm run test:lighthouse
npx playwright show-report lighthouse-report
```

Lighthouse 13.5.0, login ve gerçek form/cookie ile girilmiş dashboard'u desktop ve mobile benzetiminde ayrı ayrı ölçer. Aynı izole app fixture kullanılır; yalnız boş temp Chromium profili/CDP loopback portu açılır ve finally temizlenir. Lighthouse'un açtığı sayfada beklenen başlık ve final URL doğrulanır; login'e yönlenen bir dashboard ölçümü kabul edilmez. Dış origin trafiği engellidir. `disableStorageReset` yalnız sentetik oturumu korur; gerçek profil veya auth header enjeksiyonu kullanılmaz.

Desktop: 1350×940, DPR 1, 40 ms RTT/10 Mbps/1× CPU. Mobile: Lighthouse varsayılan mobil viewport ve simulated throttling. Her test yeni profil alır; oturum açma hazırlığı dashboard varlıklarını ısıtabilir. Fixture JS/CSS varlıklarını üretimdeki gibi gzip ile sunar (Node zlib); yine de CDN/HTTP2/önbellek ve gerçek dağıtım koşulu değildir. Üretim sunucusunda gzip/brotli zorunludur. Dört kategori, FCP/LCP/TBT/CLS ve sürüm/ayarlar JSON/HTML raporundadır. Erişilebilirlik kategorisi 100 olmalıdır; tek gürültülü yerel performans koşusuna puan eşiği konmaz. Yayın performansı/CrUX/SEO veya tam WCAG kanıtı değildir. Üç tekrar için `npm run test:lighthouse -- --repeat-each=3` kullanılabilir.

`lighthouse-report/`, `lighthouse-results/`, `test-results/**/axe-*.json` çıktıları Git dışıdır ve CI artifact'ine dahildir. Fixture gerçek DB'yi değiştirmez; admin taramaları ayar kaydetmez, restore/reset çağırmaz. Kapsam ve ölçüm kaydı memory-bank/implementation/2026-10-18-accessibility-and-lighthouse.md içindedir.

Resmî yöntemler: [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), [Lighthouse Node API](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md), [authenticated pages](https://github.com/GoogleChrome/lighthouse/blob/main/docs/authenticated-pages.md).
