# A22 — Automated accessibility and Lighthouse

18 Ekim 2026. Kullanıcının sıradaki işe devam talimatıyla mevcut A22 browser altyapısı genişletildi. Başlangıçta önceki E2E paketinin commit edilmemiş değişiklikleri vardı; korundu. Bütün memory-bank okundu. Yeni ürün kapsamı, API veya migration eklenmedi.

## Uygulanan düzeltmeler

- Giriş/kayıt ve kayıt kapalı ekranları main/h1 kullanır; görünüm korunur. Düşük kontrastlı dinamik vurgu linkleri nötr, altı çizili bağlantıdır; marka rengi değişince okunabilirlik kaybolmaz.
- Header hesap düğmesi görünen ad/rolü ezerek değiştiren aria-label yerine adını içerikten türetir; sr-only Hesap menüsü öneki mobilde de ad sağlar. Odak/Escape davranışı korunur; mevcut Header regresyonu tam yeni adı denetler.
- Lighthouse target-size denetimi Header Ara düğmesinin 18.5 px genişliğini yakaladı; en az 24 px oldu. Aynı WCAG 2.2 kuralı axe varsayılanlarına açıkça eklenince ayarlar şifre göster/gizle düğmelerinin 20×20 px olduğu da bulundu; 32×32 px yapıldı. Kural kapatılmadı.
- Profil/kullanıcı ayarları/Pomodoro alanları label–id ile bağlandı; parola görünürlük ve profil resmi ikon eylemleri isimlendirildi. Profil resmi URL alanı isimlidir; dosya/URL ve çalışma günü seçimleri aria-pressed taşır.
- Profil başlık sırası, admin dt/dd yapısı ve tarih taşıma başlığı düzeltildi. Takvim kaydırma bölgesi role=region ile isimlenir; adsız generic div üzerindeki desteklenmeyen aria-label yolu kaldırıldı.
- Yardımcı metinler ve aktif hesap durumu kontrastı, “bugün”, dakika modu ve dosya/URL/gün seçimlerinin metinleri nötr token'lara alındı. Kişisel renk ve saklı seans değerleri yeniden yazılmadı. İkon/kimlik renkleri anlamlı yerlerinde kalır.

## Tekrarlanabilir ölçüm

Kök dev bağımlılıkları @axe-core/playwright 4.14.0 ve Lighthouse 13.5.0 exact pin/lock ile eklendi; Node 24 engine uyumu registry'den kontrol edildi. Runtime bağımlılıkları/major geçişleri değişmedi. Kurulum audit'i mevcut 12 düğümü (5 high/7 moderate) göstermeye devam ediyor.

`tests/e2e/accessibility.spec.ts` açık/koyu temalarda public/öğrenci sayfaları, açık profil/parola/resim URL ve kişisel ayar bölümleri, günlük takvim/taşıma/Pomodoro editörü (iki scroll konumu), admin sayfaları ve ayar bölümlerini tarar. Chromium/WebKit desktop ve Chromium mobile emülasyonunda çalışır. Font, sonlu animasyon, başarılı veri yükleme ve görünür kontrol beklenir; hata ekranı beklenen içerik sayılmaz. Axe varsayılan kuralları ve açıkça etkinleştirilmiş WCAG 2.2 target-size uygulanır; exclude/disableRules veya violation baseline yoktur. Her violations listesi sıfır olmalıdır; JSON tüm incomplete sonuçları korur.

Mevcut test başına temp app/SQLite/sunucu fixture'ı kullanılır; sentetik manager hesabı eklendi. Gerçek admin parolası, gerçek DB, seed/reset/restore kullanılmaz. Otomatik browser origin guard, korunmuş seans/300 saniye geçmiş/integrity/FK ve finally cleanup sınırları aynen sürer.

`npm run test:lighthouse` ayrı config/rapor diziniyle login ve gerçekten giriş yapılmış dashboard'u desktop/mobile olarak ölçer. Yeni boş sahip olunan Chromium profili, loopback/CDP OS portu; gerçek form/cookie girişi ve disableStorageReset kullanılır. Dış origin engeli vardır. Lighthouse'un açtığı sayfadaki beklenen başlık + final URL + runtime error denetlenir; login'e yönlenmiş dashboard geçmez. Sayfa Lighthouse tarafından kapanmadan başlık assertion'ı dinlenir. Browser/profile finally temizlenir; gerçek tarayıcı profili veya token/header enjeksiyonu yoktur.

Desktop koşulu 1350×940 DPR1, 40ms RTT/10Mbps/1× CPU; mobile Lighthouse default 412×823/DPR1.75, 150ms RTT/1638.4 Kbps/4× CPU simulated throttling kullanır. Auth hazırlığı cache'i ısıtabilir; context request interception browser cache'ini kapatır. Servis yerel HTTP/Express static; gzip/CDN/üretim ağ koşulu değildir. Tek yerel performans puanından başarısızlık eşiği çıkarılmaz; accessibility kategori 100 beklenir. HTML/JSON ve FCP/LCP/TBT/CLS kaydı saklanır. Bu CrUX/saha verisi, tam WCAG veya gerçek cihaz kanıtı değildir.

CI check → browser journeys/axe → Lighthouse ve 7 günlük artifact adımları tanımlıdır; job süresi 20 dakika. Uzak GitHub koşumu yapılmadı. Komut/kapsam: tests/e2e/README.md.

## Doğrulama ve kalanlar

Temiz npm ci ve son npm run check başarılı: 18 contracts + 143 backend + 200 frontend = **361 workspace testi**; naming/workspace ve E2E strict/sıfır uyarılı lint/production build geçti. Son npm run test:e2e **36/36 başarılı**: önceki 18 davranış yürütmesi + 18 erişilebilirlik yürütmesi. Açık/koyu temalar × üç profilde **150 axe taraması, sıfır violations**; WCAG 2.2 target-size dahil. Retry/skip/only yok. Uzak CI koşumu yapılmadı.

`incomplete` başarıya çevrilmedi veya JSON'dan filtrelenmedi: 18 raporda aria-hidden-focus (36 Headless UI odak koruyucu node), 44 raporda color-contrast inceleme kaydı var. Bunlar tekil hata sayısı değildir. Focusable-modal-open kayıtları dialog sentinel'larına aittir; mevcut Escape/odak davranışı testli, ekran okuyucu/eksiksiz Tab döngüsü incelemesi açık. Kontrast kaydının nedenleri native select arka plan oku, SVG grafik etiketleri/kısa sayılar ve kaydırılan dialog'un kısmen kırpılan alanlarıdır. Editör iki scroll konumunda taranır. Kaynak renkleriyle kontrast hesabı: grafik #4b5563/beyaz 7.56:1, koyu #9ca3af/#111 7.44:1; input #171717/beyaz 17.93:1, beyaz/#1e1e1e 16.67:1. Bu hesaplar bütün piksel/hover/custom renk/zoom kombinasyonlarının manuel onayı değildir. Grafik günlük verisinin erişilebilir metinsel alternatifi ve yardımcı teknolojiyle kullanım ayrıca değerlendirilmelidir.

Desktop açık ve mobile koyu dashboard ile Pomodoro formunun sentetik ekran görüntüleri incelendi. Full-page dialog screenshot'ı fixed katmanları tüm belge yüksekliği bağlamında gösterir; gerçek viewport veya fiziksel cihaz kanıtı sayılmaz. Generated JSON/screenshot/trace/HTML raporları Git dışındadır.

İlk Lighthouse koşusunda mobil login performansı 67, FCP yaklaşık 5.1 sn/LCP 5.4 sn çıktı; hedef 90+ bu koşulda karşılanmadı. Coverage yaklaşık 353 KiB kullanılmayan JS ve 43 KiB CSS, CSS render blocking için tahmini 750 ms gösterdi. Bunlar tek ekranın ölçüm tahminleridir; modüllerin bütün üründe gereksiz olduğu veya toplam kazanımın toplanabileceği anlamına gelmez. Login'deki beklenen anonim refresh 401'i best-practices skoruna yansır. robots.txt isteği fixture SPA fallback'ine gider ve SEO puanını düşürür; üretim indeksleme politikası tanımlanmış sayılmaz. Bu bulgular gizlenmedi veya sırf puanı yükseltmek için audit kapatılmadı. Önce route/import grafiği ve ortak başlangıç chunk yükü ölçülmeli; üretim sıkıştırma/cache/robots ayarları dağıtım bağlamında kurulmalı, aynı koşullarda yeniden kıyaslanmalıdır. A22 ekran okuyucu, fiziksel cihaz, DST fold, native drag/resize, bütün admin yazma/Pomodoro faz akışları; A04 offsite/retention/yük/kurtarma ve major bağımlılık işleri açık kalır. Otomatik taramada ihlal olmaması tam uygunluk değildir.

Kaynaklar: [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), [Lighthouse Node API](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md), [authenticated pages](https://github.com/GoogleChrome/lighthouse/blob/main/docs/authenticated-pages.md). Fixture ve puan kapısı bu projeye özgü kararlardır.

## Lighthouse son medyanları

Dört ekran/profil × üç bağımsız koşu = **12/12 başarılı ölçüm**. Her grupta yeni app/DB/Chromium profili kullanıldı. Lighthouse 13.5.0; tüm koşullarda accessibility 100, route/başlık/runtime kontrolü başarılı.

| Ekran/profil | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| dashboard-desktop | 92 | 100 | 100 | 92 | 1.17 sn | 1.47 sn | 0 ms | 0.00000 |
| dashboard-mobile | 61 | 100 | 100 | 91 | 6.04 sn | 7.52 sn | 0 ms | 0.00000 |
| login-desktop | 96 | 100 | 96 | 92 | 1.01 sn | 1.09 sn | 0 ms | 0.00015 |
| login-mobile | 67 | 100 | 96 | 92 | 5.12 sn | 5.43 sn | 0 ms | 0.00092 |

Mobil 90+ hedefi bu ölçüm ortamında karşılanmadı. TBT sıfır olsa da FCP/LCP yüksek; sonraki paket route/import grafiği ve ortak başlangıç JS/CSS yükünü ölçerek azaltmalıdır. Tek chunk dosya adına bakarak yükün Lucide'a ait olduğu varsayılmaz; coverage ölçümü tüm uygulamada ölü kod kanıtı değildir. Sıkıştırmasız fixture sonucu gerçek dağıtım/saha performansının yerine geçmez. Üretim cache/sıkıştırma ve robots/SPA fallback politikası ayrı doğrulanmalıdır.

Son loglar: /tmp/study-tracker-a11y-clean-install.log, /tmp/study-tracker-a11y-final-check.log, /tmp/study-tracker-a11y-final-matrix.log, /tmp/study-tracker-lighthouse-final.log. Raporlar playwright-report/index.html ve lighthouse-report/index.html; ham axe/Lighthouse dosyaları test-results/ ve lighthouse-results/ içindedir. Geliştirme sırasında bulunan ihlaller düzeltildi; başarısız/yarıda kesilen keşif koşuları son başarılı sonuçların yerine kullanılmadı.

Kapanışta final başarı/hata teardown kontrolleri tamamlandı; browser/profile süreci yok, fixture temp/profile sayısı 0. Keşif koşusunun bootstrap'ı zorla kesildiğinde bir boş SQLite dizini kalmıştı (henüz hesap/seans oluşmamış). O dizinin görev sırasında oluşturulan yolu, process/file-handle yokluğu ve read-only integrity/FK/users 0/sessions 0 doğrulanıp yalnız o dizin temizlendi. Runner bootstrap interrupt cleanup otomasyonu açık iyileştirmedir; normal final teardown başarılı olması zorla sonlandırmada garanti değildir. Gerçek dev 3000/API 5002 tek listener/health OK olarak korunur. Gerçek kullanıcı DB'sine test yazması/migration/seed/reset/restore, gerçek parola okuma/değişimi veya commit/push/deploy yoktur.
