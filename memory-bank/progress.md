# Ders Takip Sistemi — İlerleme

Son güncelleme: 18 Ekim 2026, A22 otomatik erişilebilirlik/Lighthouse; yerel schema 006.

## Ürün yönü ve yol haritası (19 Ekim 2026)

**Karar (kullanıcı, 19 Ekim 2026):** Ürün TYT/AYT'ye veya yalnızca öğrencilere özel değildir. Alan/kitle bağımsız, global ve değişken odaklı bir çalışma/görev takip sistemidir; her kesime uyacak şekilde yapılandırılabilir olmalıdır. Hiçbir ekran, tip, varsayılan veya metin tek bir sınav/kitleye bağlanmaz. Bu karar projectbrief/productContext'teki eski "öğrenci/TYT-AYT" anlatımının yerine geçer. Her adım küçük, doğrulanabilir ve geriye dönük uyumludur; kalıcı veri sözleşmesi migration olmadan daraltılmaz.

Sıra (öncelik: önce yanlış varsayımları kaldır, sonra yapılandırılabilirlik, sonra eksik özellikler):

| # | Paket | Durum | Kabul ölçütü |
|---|---|---|---|
| R1 | Kitle bağımsız dil ve alanlar | **Yapıldı (19 Ekim)** | UI/kodda TYT/AYT enum'u ve "Öğrenci" etiketi yok; tek `roleLabel`; `studyField` serbest metin (eski değerler geçerli, migration yok); çift `Topic` tipi birleşti. check + E2E yeşil |
| R2 | Yapılandırılabilir terminoloji | **R2a–R2c yapıldı (19 Ekim); R2d serbest özelleştirme bekliyor** | Admin ayarıyla site genelinde "Ders/Konu/Çalışma seansı" sözlüğü (örn. Proje/Görev/Oturum, Ders/Konu); tek `terms` modülü, sabit yazılmış kelime yok; varsayılan nötr. Önce tasarım notu, public ayar DTO'su genişler (migration gerekmez, settings key/value). Karar gerek: hazır set mi, serbest metin mi |
| R3 | Global varsayılanlar | Bekliyor | `timezone` varsayılanı tarayıcıdan (şu an Europe/Istanbul sabit), tarih/hafta başlangıcı yerel ayardan; `language` tercihi gerçek mi (i18n altyapısı) yoksa kaldırılsın mı — karar gerek |
| R4 | Çalışmayan tercihleri bağla | Bekliyor | Günlük/haftalık hedef panoda gerçek ölçülen süreyle karşılaştırılır; aktif günler hedef/özetlerde kullanılır; bildirim anahtarları ya gerçek teslimata bağlanır ya ekrandan kaldırılır (çalışmayan seçenek gösterilmez) |
| R5 | Profil/Ayarlar tekrarı | Bekliyor | Ad ve parola tek yerde; diğer sayfa yönlendirir |
| R6 | Genel istatistik | Bekliyor | Kategori/ders bazlı dağılım, aralık seçimi, hedefle gerçekleşen; ölçülmemiş eski süre hariç |
| R7 | Global arama | Bekliyor | Header araması ders/konu/seans başlığı ve not içinde arar, yetki kapsamına uyar |
| R8 | Hesap kurtarma | Bekliyor | Şifre sıfırlama akışı; e-posta altyapısı kararı gerekir (SMTP/sağlayıcı) |
| R9 | Sağlamlaştırma | Bekliyor | Major bağımlılıklar + audit, mobil ilk yük (Lighthouse 90+), LICENSE kararı, giriş/kayıt sayfalarının nötr token'a taşınması |

R2 notları: `packages/contracts/src/terminology.ts` tek kaynaktır: dört hazır set (Genel=proje/görev/seans varsayılan, Eğitim=ders/konu/seans, Hedef=hedef/adım/seans, Beceri=beceri/alıştırma/seans) ve Türkçe ek/ünlü uyumu yapan `inflect` (hâl: nom/acc/dat/gen/loc/abl, çoğul); yumuşama (kitap→kitabı) bilinçli yok, serbest metin eklenmeden önce istisna listesi şart. Ayar `terminologyPreset` site ayarları key/value'sundadır (public DTO'da zorunlu alan; schema `.default` KULLANILMAZ çünkü `.partial()` yamasına varsayılanı enjekte edip her kaydı sıfırlıyordu — testle kanıtlandı). Frontend `useTerms()` ile ~35 dosyada ders/konu/seans kelimeleri türetilir; kalıp: ek gerektiren yerde terim hâl biçimiyle, ad sonda (`"{ad}"` iki nokta sonrası) veya birleşik isimlerde ikinci ad sahiplik eki gerektirdiği için "çalışma seansı" yerine yalın terim kullanılır. Vitest tüm test dosyalarında Eğitim setini önbellekten yükler (tests/setup-terminology.ts); varsayılan ve geçiş testleri tests/terminology.test.tsx içindedir. **R2c (yapıldı):** backend/contracts mesajlarındaki ders/konu/seans kelimeleri (≈40) nötr "kayıt/alt kayıt" ifadesine çevrildi (ürün adı da `API çalışıyor` sağlık mesajından çıktı); testler mesaj metnine bağlı değildi. **R2d (bekliyor):** serbest özelleştirme (admin kendi kelimesini yazar; ünlü yumuşaması istisna listesi + önizleme).

R1 notları: roller kalıcı değeri `student` olarak kalır (yeniden adlandırma migration ister); görünen ad "Kullanıcı". `studyField` anahtarı kalıcı sözleşmedir; anlamı "odak alanı" serbest metin (en çok 60 karakter) olarak genişletildi. Backend/seed zaten genel kategoriler içerir.

## Kod tabanı temizliği (19 Ekim 2026)

Faz 1–4 uygulandı: ölü kod/CSS/Tailwind yapılandırması/export, kullanılmayan dört uç, 18 `any` (kural artık `error`), kök `eslint-plugin-react-hooks`, README ve `.env.example` düzeltmeleri. `npm run check` yeşil (18/141/200), `npm run test:e2e` 36/36; üretim CSS hash'i değişmedi. Aynı gün Faz 5 büyük dosya bölme de yapıldı (CreateSessionModal, PlannerCalendar, api.ts/httpClient, Ayarlar/Profil/Ders detay sayfaları; check 18/141/216, E2E 36/36). Major bağımlılıklar ve LICENSE kararı bekliyor. Ayrıntı: implementation/2026-10-19-cleanup.md.

## Kod tabanı temizliği — Faz 4 (18 Ekim 2026)

Kullanıcı kararıyla frontend'in çağırmadığı dört backend ucu silindi: `GET /categories/:id`, `GET /topics`, `GET /topics/:id`, `GET /users/:id`; ilgili controller'lar, `categoriesAPI.getCategory`/`usersAPI.getUser`/`topicsAPI.getTopics`/`getTopic` ve bağlı testler kaldırıldı (backend 143→141 test; tercih testi okumayı `/auth/me` ile yapar, arşiv testi DB sayımı kullanır). `npm run check` yeşil: 18 contracts + 141 backend + 200 frontend; E2E bu pakette çalıştırılmadı. Kalan temizlik fazları (ölü export/CSS/Tailwind, bağımlılık, `any`) plan dosyasındadır, uygulanmadı. Şema/veri/gerçek DB değişmedi.

## Genel durum

İnceleme sonrası geliştirme başladı. Derleme ve kalite tabanı çalışır hale getirildi; kritik erişim/veri okuma sorunları ve tam kapsamlı site taramasında tespit edilen çalışma zamanı/UI/veri bütünlüğü hataları kapatıldı. Bütün audit bulguları çözülmüş veya üretime hazır kabul edilmez.

Kurallar: `workingPrinciples.md`. Başlangıç incelemesi: `audits/2026-10-15-project-audit.md`. Uygulama kaydı: `implementation/2026-10-15-foundation.md`.

## A22 — Otomatik erişilebilirlik ve Lighthouse (18 Ekim 2026)

Form etiketleri/ikon adları/seçili durumlar, main/h1/başlık sırası/admin dt-dd/takvim region, Header ad içeriği ve kontrast sorunları düzeltildi. Lighthouse Ara düğmesinin 18.5px hedefini buldu (min 24); WCAG 2.2 target-size axe'a açıkça eklenince iki ayar şifre düğmesi de 20→32 px oldu. Kurallar/öğeler hariç tutulmadı; saklı veri/renkler değiştirilmedi.

Temiz npm ci ve son check başarılı: **361 workspace testi** (18/143/200), strict/naming/lint/build. Son browser matrix **36/36**: 18 önceki davranış + 18 erişilebilirlik yürütmesi. Açık/koyu temalar/üç profil boyunca **150 axe taraması, sıfır violations** (default+target-size). 18 raporda aria-hidden-focus ve 44 raporda color-contrast incomplete korunur; tam WCAG veya fiziksel cihaz uygunluğu değildir.

Lighthouse 13.5.0, login/dashboard × desktop/mobile × üç bağımsız koşu: **12/12**, accessibility hepsinde 100. Performance medyanları login **96/67**, dashboard **92/61** (desktop/mobile); mobil hedef90+ karşılanmadı. Login mobil LCP 5.43 sn/dashboard 7.52 sn, TBT 0; sonraki öncelik başlangıç JS/CSS ve route/import yükünü ölçerek azaltmaktır. Yerel sıkıştırmasız static fixture gerçek deployment/CrUX değildir. Login 401 best-practices 96, robots SPA fallback SEO91–92 olarak görünür; audit gizlenmedi. Yeni axe 4.14.0/Lighthouse 13.5.0 dev pin/lock, CI tarama/ölçüm/artifact vardır; uzak koşum yok, audit 12 backlog sürer.

Gerçek DB/parola/şema 006 değişmedi; final teardown/integrity/FK/seans/300 saniye geçmiş denetimleri geçti. Erken kesilmiş bootstrap'tan kalan boş temp DB yalnız sahipliği, handlesızlığı ve read-only users 0/sessions 0/integrity/FK doğrulanarak temizlendi; force interrupt finally garantisi değildir, harness iyileştirmesi açık. Son fixture/profile/temp sayısı 0. Root dev 3000/API 5002 sağlıklı. Önceki E2E çalışma ağacı korunur; commit/push/deploy yok.

Kaynak/medyan tablo/manuel inceleme sınırları: implementation/2026-10-18-accessibility-and-lighthouse.md; komutlar tests/e2e/README.md. **A22 kalan:** mobil ilk yük, incomplete/ekran okuyucu ve grafik veri alternatifi, fiziksel cihaz/DST fold/daha geniş admin-Pomodoro-pointer E2E, uzak CI ve kesilen bootstrap cleanup. A04/major bağımlılıklar açıktır.

## A22 — İzole otomatik tarayıcı testleri (18 Ekim 2026)

İlk gerçek tarayıcı E2E kapısı tamamlandı: altı senaryo, masaüstü Chromium/WebKit ve Pixel 7 mobil Chromium emülasyonunda **18/18 başarılı**. Gerçek giriş/cookie/reload/hesap izolasyonu, seans create/saat-süre/reload, iki sekmeli gerçek 409 ve açık retry, kısa kart hedefleri/klavye/gün sonu odak, bildirim 503/retry/okundu ve responsive menü/taşma doğrulanır. Mobil profil 412×839 CSS px/touch emülasyonudur; fiziksel cihaz veya kurulu Safari iddiası yoktur.

Test başına yeni browser context, sahip olunan boş mkdtemp SQLite, random JWT/sentetik hesaplar ve OS loopback portu vardır. Üretim frontend `/api` yoluyla build edilir; browser kendi fixture origin'i dışına çıkamaz. Backend test modunda `.env` yüklemez; gerçek kullanıcı DB'si/parolası veya açık dev sunucusu fixture değildir. Kapanışta integrity/FK, beş değişmeyen seansın tüm kolonları, not ve 300 saniyelik interval geçmişi denetlenir; süreç/DB dizini finally temizlenir. Cleanup hatası testi başarısız yapar.

E2E gerçek bir taşıma sonrası odak yarışını yakaladı: onClose içindeki erken RAF kaldırıldı; kapalı dialog commit'inden sonraki effect güncel kart/Bugün odağını kurar ve unmount'ta bekleyen RAF'ı iptal eder. Odak beklentileri gevşetilmedi. İki odak akışı üç profilde üçer kez ayrıca çalıştırıldı: 18/18 tekrar geçti. Aktif pencere testleri tek worker ile yürür; retry/skip yoktur.

Temiz npm ci, npm run check ve son npm run test:e2e başarılı: **18 contracts + 143 backend + 200 frontend = 361 workspace testi**, ayrıca **18 E2E yürütmesi** (toplam 379). Naming, workspace/E2E strict, sıfır uyarılı lint ve production build geçti. Yeni Playwright 1.64.1 dev bağımlılığı ve lock vardır. CI browser install/E2E/7 günlük artifact adımları eklendi; uzak GitHub koşumu yapılmadı. Yerel 12 audit düğümü (5 high/7 moderate) backlog'u sürer.

A22 kalan: tam WCAG/ekran okuyucu, Lighthouse, fiziksel dokunmatik cihaz, DST fold ve admin/Pomodoro/native drag-resize akışlarında daha geniş E2E. A04/major bağımlılıklar açık. Kaynak/komut/sınırlar: tests/e2e/README.md ve implementation/2026-10-18-isolated-browser-tests.md. Gerçek DB'ye test yazması/migration/seed/reset/restore veya gerçek parola okuma yok; schema 006 korunur.

## A22 — Kısa takvim kartlarının yerleşimi (17 Ekim 2026)

Kısa seansların minimum tıklama yüksekliği, komşu kartları saat sınırları üzerinden örtebiliyordu. Ortak calendarGeometry artık gerçek piksel başlangıcı ve en az 28 px görsel yükseklik üzerinden bağlı çakışma grupları kurar; serbest sütunları yeniden kullanır ve eşit başlangıçta ID ile stabil sıralar. Kayıtların UTC başlangıç/bitiş/süre/durum/not değerleri değiştirilmez. İptal edilmiş ve diğer görünür kartlar aynı yerleşime katılır. Her etkileşim sütunu en az 160 px; boş haftalık günler 104 px kalır. Header ve saatler aynı kolon şablonunu kullanır, yoğun günlerde yatay kaydırma vardır. Gün sonunda 36 px boşluk son dakika kartını ve odak çerçevesini korur.

Kart başlığı/ikon hedefleri en az 24 px olarak 28 px kabuğa sığar; 68 px altı kompakt satırdır. Kısa kartta hedefi örten resize tutamacı kaldırıldı (36 px altı); mevcut Saat ve süreyi değiştir alternatifi korunur. Büyük kartlarda pointer resize devam eder. Takvim başlangıcında saniye/milisaniye korunur; hiçbir kaydın zamanı kaydırılmaz. Günlük/haftalık aynı motoru kullanır; DOM sırası görünür başlangıç/ID sırasıdır.

Doğrulama: **18 contracts + 142 backend + 200 frontend = 360 test**, atlanan yok; npm run check naming/strict/lint/production build geçti. Son görsel boşluk/sıra düzenlemesinden sonra frontend strict, kök lint, 200 test ve production build tekrar geçti. Yeni 4 geometry ve günlük/haftalık toplam 4 component regresyonu var. Ayrı temp production fixture'da 1 dakikalık komşu kartlar/iptal kaydı, klavye menüsü/Escape/odak ve 23:59 hedefi kontrol edildi. Beş seansın bütün kolonları eski snapshot ile aynı; interval üretilmedi, integrity/FK temiz. Gerçek kullanıcı DB'si/şema/bağımlılıklar değişmedi. Fixture sekme/süreç/temp veri temizlendi; root dev 3000/API 5002 korunur.

A22 bütünüyle kapanmadı: gerçek dokunmatik cihaz, DST fold, tam WCAG/ekran okuyucu, Lighthouse ve otomatik gerçek tarayıcı E2E açık. A04/bağımlılık backlog'u sürer. Ayrıntı: implementation/2026-10-17-calendar-card-layout.md.

## A22 — Header ve takvim erişilebilirliği, ilk paket (17 Ekim 2026)

Header bildirim ve hesap menüleri Headless UI Popover.Group kullanır; ilk odak, Escape ile tetikleyiciye dönüş, birbirini kapatma ve dış hedefe odak davranışı testlidir. Manuel document dinleyicileri/ikinci popover yolu kaldırıldı. Arama tek form gönderimidir. Bildirim pending/error/retry/gerçek boş durumları ayrıldı; başarısız arka plan okumasında eski kayıt açıkça belirtilir, bilinmeyen okunmamış sayısı gösterilmez ve okundu yazması kapatılır. Liste son 5 tamamlanan seanstır; yerel okundu bilgisi hesaba özeldir. İşlem sonrası odak kalıcı kapatma düğmesine döner ve sonuç duyurulur. Geç hesap okuması epoch sınırında reddedilir.

Takvimde mevcut boş saat düğmeleri tek Tab durağı ve ok/Home/End/Ctrl+Home/End gezinmesine geçirildi; Enter/Space mevcut editörü açar. Seans işlemlerindeki etiketli saat/süre alanları sürükleme/boyutlandırmaya alternatif sunar ve mevcut sürümlü yazma motorunu kullanır. Yalnız değişen alanlar gönderilir; 409/read hatasında taslak korunur, kaynak yeniden okunmadan yazılmaz ve otomatik yazma tekrarı yapılmaz. Hücre değişince odak yeni seans düğmesine, görünür aralık dışındaysa Bugün düğmesine döner. Küçük kart komutları en az 24 px oldu; kısa komşu kart çakışmalarının tamamı çözülmedi.

npm run check: **18 contracts + 142 backend + 192 frontend = 352 test**, atlanan yok; naming/strict/lint/production build geçti. Son odak düzeltmesinden sonra frontend strict/root lint/192 test/build tekrar doğrulandı. Yeni 7 Header ve günlük/haftalık toplam 10 takvim regresyonu var. Ayrı production fixture ile bildirim okundu/ölçülen 5 dakika, popover/Escape/odak, günlük ok/Home/End/Enter ve saat/süre kaydı doğrulandı. Tarayıcıda bulunan hücre değişimi ref çakışması düzeltildi; odak yeni seans komutuna döndü. SQLite iki seansı, notu ve 300 saniyelik ölçümü korudu; integrity/FK temiz. Test oturumu kapatıldı, fixture süreç/sekme/DB/helper dosyaları kaldırıldı. Gerçek DB'ye test yazması/migration/seed/reset/restore yok; schema 006 korunur.

**A22 açık:** otomatik gerçek tarayıcı E2E, tam WCAG/ekran okuyucu, Lighthouse, gerçek dokunmatik cihaz kanıtı, DST fold ve kısa komşu kart yerleşimi. Bu paket A22'nin tamamını kapatmaz. A04 ve bağımlılık backlog'u sürer. Detay: implementation/2026-10-17-header-and-calendar-accessibility.md.

## A19 — Ortak sözleşmeler ve Plan sınırları (17 Ekim 2026)

A19 auth/user update/backup/plan doğrulama ve bu yüzeylerin DTO/Plan ayrımı kapsamı tamamlandı. Ortak Zod 4 şemaları normalize edilmiş body/query/params üretir; belirtilmeyen request bölümleri korunur. Joi dosyası/paketi kaldırıldı. Public register yetki alanlarını reddeder; admin patch rol/aktiflik varsayılanı üretmez. Profil/parola/query/ID/null ve UTF-8 sınırları ortak kaynaktan gelir. Validation hataları field/message biçimindedir.

Auth ve kullanıcı yanıtları tek izinli userResponse projeksiyonudur. İstemci auth/profile/admin liste-özet/backup yanıtlarını runtime doğrular; bozuk yanıt başarı/boş veri olmaz. Numeric API ID auth view sınırında String'e dönüştürülür. Backup DTO host path döndürmez; verified gerçek boolean ve reset safetyBackupId doğrulanır. Eski hesaptan geç parola yanıtı yeni hesabı logout etmez.

Plan isteğe bağlı tarihli hedef kabı, takvim girdisi StudySession'dır. Otomatik/zorunlu Plan veya yeni hedef ekranı eklenmedi; kullanılmayan frontend plansAPI/Plan tipleri kaldırıldı. Plan create/update/reactivation tek IMMEDIATE transaction'da tarih/aktif çakışmasını denetler; hata 400/409/404'tür. Delete seansları instance save ile ayırır, not/ölçüm geçmişini korur ve session sürümünü ilerletir. Metadata last-writer-wins kalır. Date-only ISO UTC olarak korunur; belirsiz tarih reddedilir. goals patch diğer alanları korur.

Giriş/kayıt/profil/parola formları ortak şemaları kullanır; sessionForm.ts görünüm adaptörüdür ve gönderimde ortak seans DTO ayrıca doğrulanır. Gerçek süre sınırı form/API için 1–1440 dakika (kesirli geçerli dakika dahil) olarak birleşti. Üç workspace tek Zod 4.6.7 kullanır; Preferences v1 alanları değişmeden ayrı modüle taşındı.

Temiz npm ci ve npm run check geçti: **18 contracts + 142 backend + 175 frontend = 335 test**, atlanan yok; naming/strict/lint/production build başarılı. Yeni 8 contracts/12 backend/13 frontend regresyonu var. Plan yarışları/detach/sürüm/300 saniye ölçüm koruma/SQL rollback gerçek HTTP ve mkdtemp SQLite üzerinde testli. Yeni form ve geçici HTTP transport testleri gerçek tarayıcı E2E değildir. Bu pakette yeni manuel tarayıcı doğrulaması yapılmadı. Audit hâlâ 12 paket düğümü (5 high/7 moderate/0 critical); major bağımlılık işleri açık.

Gerçek DB'ye test yazması/migration/seed/reset/restore uygulanmadı; schema 006 ve özel snapshot pointer'ları korunur. Tek root dev localhost:3000/API 5002 temiz contracts/Vite başlangıcıyla yeniden açıldı; log /tmp/study-tracker-a19-dev.log. Detay: implementation/2026-10-17-shared-request-contracts.md.

**Sıradaki:** A22 Header bildirim hata/boş ayrımı ve popover klavye/odak; takvim klavye/dokunmatik alternatifleri ve otomatik E2E/WCAG/Lighthouse. A04 ve bağımlılıklar açık. Bütün kaynakların runtime response DTO'su/optimistic metadata'sı veya yeni Plan UI'ı tamamlandı iddiası yoktur.

## A21 — Yönetim özeti ve seans yüzeyleri (17 Ekim 2026)

Yönetim özeti nötr yüzeylere geçirildi; global sayılar ve ölçülen süre korunur, beş durum/tür doğru etiketlenir. Özet ve son kullanıcılar bağımsız loading/error/retry/gerçek boş durumlarını gösterir. GoalsOverview kaldırıldı; gerçek işlevi karşılayan TodaysPlans tek günlük işlem/editor sınırıdır.

Günlük işlemler ve seans editörü ortak useAccountMutation busy/mount/epoch sınırını kullanır. Pending kapama/çift gönderim kilitlidir, async onay sunucuyu bekler. 409 otomatik yazma tekrarlamaz; güncel kaynak okunur, taslak korunur ve yeni açık onay gerekir. Başarısız kaynak okuması eski sürümle yazmayı engeller. Nested silme onayı Escape/odak/taslak korur. Kapalı editör ders sorgulamaz; mevcut pasif ders, tarihsel başlık ve açıklamayı temizleme korunur. Pomodoro ortak sayaç üzerinden açılır; ikinci motor yoktur. Dekoratif modal yüzeyleri ve tekrar eden yaşam döngüsü yolları kaldırıldı.

npm run check: **10 contracts + 130 backend + 162 frontend = 302 test**, atlanan yok; naming/strict/lint/production build geçti. Son editör temizliğinden sonra frontend strict/lint/162 test/build tekrar geçti. Yeni 8 yönetim özeti ve 16 seans yüzeyi regresyonu frontend/tests altındadır. Üretim import grafiğinde 73/73 kaynak erişilebilir; bu tüm export/runtime kullanım kanıtı değildir.

Atılabilir production fixture ile global özet/ölçülen süre/beş durum, günlük plan, editör yerel taslağı, nested Escape ve odak dönüşü doğrulandı. SQLite bütünlüğü ve özgün kayıtların değişmediği kontrol edildi. Tarayıcıda save/start/delete yapılmadı; yazma davranışı otomatik test kapsamındadır. Geçici oturum kapatıldı, sekme/süreç/DB temizlendi. Gerçek DB'ye test yazması/migration/seed/reset/restore yapılmadı; schema 006 korunur. localhost:3000 HTTP 200 ve API 5002 sağlıklı; iki portta birer servis var. Detay: implementation/2026-10-17-admin-and-session-surfaces.md.

**Sıradaki:** A19 auth/user update/backup/plan ortak DTO ve Plan API/StudySession ürün anlamı. A21 admin/modal/today alt kapsamı kapandı; performans ve bütün proje bakımı tamamlanmış sayılmaz. Header bildirim hata/boş ayrımı ve popover klavye/odak A22'ye kaydedildi. A22/A04 ve bağımlılık backlog'u açıktır.

## A21 — Site ayarları ve yedekleme (17 Ekim 2026)

Site ayarları ve yedekleme alt paketi tamamlandı. AdminSettingsPage nötr tasarım ve etiketli alanlar kullanır; pristine form yeni okumayı izler, düzenlenen taslak refetch/bölüm değişiminde korunur. Shared schema ile yalnız değişen alanlar kaydedilir; no-op yazmaz, hata taslağı korur. Private settings read/write revision + account generation geç yanıtı sınırlar. Public hata private hatayı ezmez.

BackupPanel hesaplı Query ile loading/error/retry/boş listeyi ayırır. Restore yalnız verified === true ise açılır; dirty taslakta restore/reset kapalıdır. Ayar/yedek/restore/reset tek busy/mount/epoch hook'u ve async ConfirmDialog kullanır; pending kapama/çift gönderim kilitlidir. Restore ack sonrası protected refetch öncesinde logout; reset ack sonrası account invalidation + private settings yeniden okuma vardır. Native confirm/gecikmeli reload kaldırıldı. Bildirim teslimatı/offsite/saklama altyapısı uygulanmış gibi gösterilmez.

npm run check: **10 contracts + 130 backend + 138 frontend = 278 test**, atlanan yok; naming/strict/lint/production build başarılı. Yeni 18 ekran testi frontend/tests/admin-settings.test.tsx, 4 store yarış/sınır regresyonu var. Son frontend strict/root lint tekrar geçti. Temp production fixture: taslak/bölüm/dirty kilit, verified/unverified liste, manuel backup create/refetch, restore Escape/odak ve settings_only iptal doğrulandı. Temp snapshot checksum/integrity ve hesap/site ayarı korunması kontrol edildi; kaydedilmemiş taslak DB'ye yazılmadı. Tarayıcı restore/reset final onayı verilmedi; gerçek servis davranışları mevcut temp SQLite testlerinde geçer. Fixture sekme/süreç/DB temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002 sağlıklı; log /tmp/study-tracker-user-management-dev.log. Detay: implementation/2026-10-17-admin-settings-and-backups.md.

**Sıradaki:** A21 diğer modal/admin (özellikle yönetim özeti) nötr yüzey/kullanılmayan yol son denetimi; ardından A19 auth/user update/backup/plan DTO ve Plan ürün anlamı. A22/A04 ve bağımlılık backlog'u açık.

## A21 — Kullanıcı yönetimi (17 Ekim 2026)

Kullanıcı yönetimi/oluşturma tamamlandı: nötr yüzeyler, 20 kayıt/sayfa ve sunucu toplamı, bütün kayıtlarda sunucu araması, stabil ikincil ID sıralaması, hata/boş/retry ayrımı ve son satır sonrası sayfa düzeltmesi. Rol/durum/silme onayları sunucu başarısını bekler; hata, pending, çift gönderim, öz-koruma ve hesap epoch sınırı uygulanır. Oluşturma istemci/admin POST ortak Zod 4 sözleşmesiyle doğrulanır; parola tekrarı gönderilmez, form yeniden açılınca eski kimlik bilgileri temizlenir. EditorDialog ve useAccountMutation katalog ile kullanıcı akışlarında ortaktır; eski CatalogEditorDialog kaldırıldı.

npm run check: **10 contracts + 130 backend + 116 frontend = 256 test**, atlanan yok; naming/strict/lint/production build başarılı. Yeni 13 frontend ekran testi frontend/tests/user-management.test.tsx, 5 temp HTTP/SQLite testi backend/tests/user-management.test.cjs, 2 sözleşme testi packages/contracts/tests/users.test.cjs içindedir. Production bundle ayrı atılabilir DB'de 102 kullanıcı/6 sayfa, ikinci sayfa, tüm katalog araması, silme onayı/iptal, oluşturma formu etiketleri ve Escape/odak dönüşüyle doğrulandı. Tarayıcıdan kalıcı silme/rol değişikliği/yeni parola kaydı yapılmadı; bunların davranışı otomatik test kapsamındadır. Fixture sekme/süreç/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002, log /tmp/study-tracker-user-management-dev.log. Detay: implementation/2026-10-17-user-management.md.

**A21 kalan:** AdminSettingsPage ayar/yedekleme taslak/refetch, dirty patch, backup GET hata/boş ayrımı ve restore/reset async onay/busy/error/epoch; verified === true kontrolü. Diğer kalan admin yüzeylerinin nötr tasarım incelemesi sürer. A19 kalan auth/user update/plan/backup DTO ve Plan sözleşmesi; A22/A04 açıktır.

## A21 — Kategori yönetimi ve test düzeni (17 Ekim 2026)

Kategori yönetimi alt paketi tamamlandı: nötr liste ve ortak CategoryEditorModal/CatalogEditorDialog; shared contracts doğrulaması, yalnız değişen alanların kaydı, hata/boş/retry ayrımı, pasif kategori görünürlüğü ve taslak koruması. Silme/taşıma onayı sunucu başarısını bekler; hedef açıkça seçilir, hata/pending/çift gönderim ve account epoch sınırı uygulanır. İç içe Dialog Escape/odak dönüşü testlidir. Eski inline form/ikon/mutation tekrarları kaldırıldı.

Yeni 13 ekran regresyonu frontend/tests/category-management.test.tsx içindedir; tests/ Vitest, strict TypeScript ve ESLint kapsamına alındı. Mevcut src testleri korunur; topluca taşıma veya kopyalama yapılmadı. npm run check: **8 contracts + 125 backend + 103 frontend = 236 test**, atlanan yok; naming/strict/lint/production build başarılı. Ayrı production fixture'da create/edit/pasiflik/Escape ve taşıma onayı/iptal kontrol edildi. Temp API ile 3 özel/ortak/pasif ders taşındı; konu/ilerleme/seans/not/300 saniyelik interval geçmişi birebir korundu, integrity/FK temiz. Tarayıcı reload yeni kategori adını gösterdi. Fixture sekme/süreç/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok. Tek root dev localhost:3000/API 5002, log /tmp/study-tracker-category-management-dev.log. Detay: implementation/2026-10-17-category-management.md.

**A21 kalan:** kullanıcı yönetimi/oluşturma ve ayar/yedekleme ekranlarının nötr tasarım, async onay, hata/taslak ve hesap sınırı tutarlılığı. Kategori ve öğrenci katalog UI/ortak planner tamamdır. A19/A22/A04 açık kalır.

## A21 — Öğrenci katalog düzenleme alt paketi (16 Ekim 2026)

Öğrencinin kendi özel ders/konusunu düzenleme ve ders silme/konu arşivleme arayüzü tamamlandı. Arşivden geri alma ve arşivde düzenleme eklendi. CourseEditorModal öğrenci/admin create/edit için tek uygulamadır; TopicEditorModal da create/edit'i birleştirir. Eski iki create modalı ve admin içindeki ikinci CourseModal kaldırıldı. Ortak dialog/ikon/yetki ve mutation sınırı vardır; shared contracts doğrulaması, değişen alanları gönderme, taslak/hata/pending koruması ve account epoch izolasyonu testlidir. Ders listesi/detayı ve admin ders yönetimi nötr tasarım sistemine taşındı. Restore sırasında aktif aynı ad çakışması transaction içinde 409 ile reddedilir; ilerleme/geçmiş korunur.

`npm run check`: **8 contracts + 125 backend + 90 frontend = 223 test**, atlanan yok; naming/strict/lint/production build başarılı. Son erişilebilir drag-handle adı eklemesinden sonra ilgili frontend typecheck/lint/5 component testi/build tekrar geçti. Production fixture'da öğrenci ders/konu edit, arşiv UI/geri alma/reload ve admin ortak ders create doğrulandı. Temp SQLite kontrolünde completed ilerleme, seans notları/bağlantıları ve 300 ölçülmüş saniye korundu; FK temiz. Tarayıcıdaki son kalıcı silme onayı iptal edildi; silme API/SQLite regresyonlarında testlidir. Fixture süreçleri/sekmesi/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002 çalışır; log /tmp/study-tracker-shared-planner-dev.log. Commit/push/deployment yok. Detay: implementation/2026-10-16-catalog-editing.md.

**A21 kalan:** kategori/kullanıcı/ayar ve diğer modal/admin yüzeylerinde nötr tasarım tutarlılığı. Öğrenci katalog UI ve ortak planner tamamdır; A19/A22/A04 açık kalır.

## A21 — Ortak planlayıcı alt paketi (16 Ekim 2026)

A21'in planlayıcı alt paketi tamamlandı. WeeklyPlanner/DailyCalendar tek PlannerCalendar, usePlannerCalendar, CalendarSessionCard ve calendarGeometry kullanır; eski iki motor kaldırıldı. Drag/resize/tarih taşıma ve seans komutları aynı busy ref, sunucu onayı/sürüm ve auth epoch sınırındadır. 409 yazmayı otomatik tekrarlamaz; güncel kaynak okunur, açık hedef tarih korunur ve yeni kullanıcı onayı gerekir. Gerçek end-start süresi korunur, gece yarısında sessiz kırpma kaldırıldı; ortak CalendarDate dönüşümü artık milisaniyeyi korur. Async Confirm/Move dialog başarı bekler, hata/pending görünürdür.

npm run check: **8 contracts + 123 backend + 74 frontend = 205 test**, atlanan yok; naming/strict/lint/production build başarılı. Production fixture'da native drag 09:00→11:15, resize 60→90 dk, ertesi güne taşıma, günlük/haftalık/reload ve gerçek edit formu doğrulandı. Temp DB'de 3 planlanmış seans/notlar ve gece seansı korundu; ölçüm uydurulmadı. Fixture temizlendi. Gerçek DB'de migration/seed/reset/restore veya test verisi yazılmadı; yerel schema 006 korunur. Tek root dev localhost:3000/API 5002, log /tmp/study-tracker-shared-planner-dev.log. Commit/push/deployment yok. Detay: implementation/2026-10-16-shared-planner.md.

Bu planlayıcı paketi kapanışında öğrenci katalog UI ve kalan modal/admin tasarımı açıktı. Öğrenci katalog alt paketi yukarıdaki sonraki kayıtta tamamlandı; tarihsel 205 test sonucu korunur.

## Önceki kapanış ve yerel entegrasyon

Kullanıcı limit nedeniyle başka yapay zekâlarla A17/A18/A24 ve ek düzeltmeleri tamamladı; güncel progress ve kod esas alındı, bu paketler yeniden uygulanmadı. Yarım kalan A15 kapanışı (tarayıcı kanıtı/temizlik/bellek kaydı) tamamlandı. Bütün güncel kodla npm run check yeniden başarılı: **8 contracts + 123 backend + 53 frontend = 184 test**, atlanan yok; naming/strict/lint/production build geçti. Log /tmp/study-tracker-final-integration-check.log.

A24'ün açık kalan normal yerel 006 yükseltmesi de tamamlandı: dev süreçleri durduruldu; native özel snapshot checksum/integrity/FK ile doğrulandı (.local/topic-progress-upgrade-2026-10-16.json özel pointer, 0600). npm run db:migrate sonrası önceki 12 tablonun bütün satırları snapshot ile aynı bulundu; user_topic_progress boş, geçmiş durum türetilmedi. Güncel schema manuel backup id 6 alındı. Gerçek veride seed/reset/restore veya test fixture yazması yok. Tek root npm run dev localhost:3000/API 5002 üzerinde yeniden başlatıldı; log /tmp/study-tracker-final-integration-dev.log. Commit/push/deployment yok.

A17/A18/A24 için önceki kayıtların kanıt sınırı korunur; bu kapanışta onların yeni manuel tarayıcı doğrulaması yapılmadı. Sonraki açık işler progress listesindeki A21/A19/A22/A04'tür.

## Site ve kod tabanı denetimi / hata düzeltmeleri (16 Ekim 2026)

Kaldığımız yerden devam etmeden önce tüm sayfalar, bileşenler, API uç noktaları ve sözleşmeler tarandı; tespit edilen hatalar düzeltildi:

- **Geliştirme sunucusu (`backend/package.json`):** `tsx watch` komutuna `--clear-screen=false --exclude "../node_modules/**" --exclude "*.sqlite*" --exclude "backups/**"` eklendi; macOS üzerinde üst dizindeki `node_modules` ve SQLite WAL değişimlerinden kaynaklanan sürekli yeniden başlatma döngüsü giderildi.
- **Çalışma seansı ilişki temizleme ve arşivlenmiş ders/konu koruması (`packages/contracts/src/studySessions.ts`, `backend/src/models/StudySession.ts`, `backend/src/services/studySessions.ts`):** `updateSessionSchema` içinde `courseId`, `topicId` ve `planId` alanlarına `.nullable().optional()` desteği eklendi. Seans güncellenirken `null` gönderildiğinde ders/konu/plan bağının temizlenmesi, ders değiştiğinde eski konunun otomatik sıfırlanması ve geçmişte oluşturulmuş bir seansın bağlı olduğu ders/konu sonradan pasife alınsa bile seansın düzenlenebilmesi sağlandı.
- **Katalog aktif/pasif filtreleme, sıralama ve arşivlenmiş konu adı/sırası (`backend/src/controllers/courseController.ts`, `backend/src/controllers/topicController.ts`, `backend/src/services/catalog.ts`):** `getCourses`, `getCourseTopics` ve `getTopics` uç noktalarına `isActive=all` desteği eklendi; admin panelinde pasife alınan ders ve konuların kaybolması önlendi. `getCourses` ve `getCourse` içindeki `Topic` alt sorgularına `separate: true, order: [['order', 'ASC'], ['id', 'ASC']]` eklendi. `services/catalog.ts` içinde `assertTopicName`, `appendTopicOrder` ve `createTopic` sıra çakışması kontrolleri `isActive: true` konularla sınırlandırıldı; arşivlenmiş (`isActive: false`) konuların aynı adla yeni konu açılmasını engellemesi ve sıra numarası boşluğu yaratması düzeltildi.
- **Kullanıcı yönetimi, profil ve parola doğrulama (`backend/src/models/User.ts`, `backend/src/utils/validation.ts`, `backend/src/controllers/authController.ts`, `backend/src/controllers/userController.ts`, `frontend/src/pages/profile/ProfilePage.tsx`, `frontend/src/pages/settings/UserSettingsPage.tsx`, `frontend/src/pages/admin/AdminUsersPage.tsx`, `frontend/src/components/admin/CreateUserModal.tsx`):** `User.role` model doğrulaması eklendi. `updateProfileSchema` içinde base64 (`data:image/...`) profil fotoğrafları ve fotoğraf/alan temizleme (`null` / `''`) desteklendi. `ProfilePage` ve `UserSettingsPage` parola uzunluğu kuralları backend ile (en az 12 karakter, en fazla 72 UTF-8 bayt) eşitlendi ve store hidrasyon senkronu düzeltildi. `userController` içinde sayfalama/sıralama/rol parametreleri doğrulandı; `createUser` ve `deleteUser` işlemleri `IMMEDIATE` transaction içine alındı (kullanıcı silindiğinde özel derslerinin temizlenmesi, seans bağlantılarının koparılması ve oturumlarının iptali dahil); `getUserStudyStats` hedef kullanıcının saat dilimini kullanacak şekilde düzeltildi; admin kullanıcının kendi hesabını pasife alması, silmesi veya öğrenciye düşürmesi hem API hem UI (`AdminUsersPage`) tarafında engellendi.
- **Katalog önbellek anahtarı ve kategori silme/taşıma UI (`frontend/src/components/modals/CourseCreateModal.tsx`, `frontend/src/components/modals/CategoryManagementModal.tsx`, `frontend/src/components/common/ConfirmDialog.tsx`, `frontend/src/pages/CoursesPage.tsx`, `frontend/src/pages/admin/AdminCoursesPage.tsx`, `frontend/src/pages/CourseDetailPage.tsx`):** `accountKeys.catalog('categories')` önbellek anahtarının farklı bileşenlerde farklı veri tipleriyle (`AxiosResponse` vs `Category[]`) ezilmesi sonucu oluşan çökme düzeltildi. Öğrenci `CoursesPage` ekranındaki yetkisiz `"Kategoriler"` düğmesi yalnız adminlere sınırlandı; `AdminCoursesPage` ekranına `"Kategoriler"` yönetim modalı, dersleri başka kategoriye taşıyarak silme (`migrateToCategoryId`) seçicisi, `isActive: 'all'` sorgusu ve dinamik ders ikonları eklendi. `CourseDetailPage` üzerinde `userId` karşılaştırması sayısal olarak normalize edildi.
- **Planlayıcı ve gösterge paneli etkileşim düzeltmeleri (`frontend/src/components/planner/CreateSessionModal.tsx`, `WeeklyPlanner.tsx`, `DailyCalendar.tsx`, `GoalsOverview.tsx`, `MoveSessionModal.tsx`, `frontend/src/components/dashboard/RecentActivities.tsx`):** `CreateSessionModal` içinde `"Mola"` (`break`) kategorisi seçildiğinde form geçerliliğinin güncellenmemesi (`shouldValidate: true`), moladan çıkınca `sessionType` değerinin `'study'`'ye dönmemesi ve ders seansını molaya/özel seansa çevirirken `courseId: null, topicId: null` gönderilmemesi düzeltildi. `WeeklyPlanner` üzerinde boyutlandırma önizleme süresinin piksel yüksekliği (`48`) üzerinden yanlış hesaplanması düzeltildi ve seans kartına tıklandığında düzenleme modalının açılması sağlandı. `DailyCalendar` sağ tık menüsüne dışarı tıklama/Escape ile kapanma ve boyutlandırma sırasında canlı süre rozeti eklendi; `PomodoroModal` kapandığında küçültülmüş durum sıfırlandı. `GoalsOverview` içinde duraklatılmış seanslar için `canStartSession` kontrolü ve saat dilimi uyumlu `viewNow()` varsayılan tarihi eklendi. `MoveSessionModal` tarih senkronu ve erişilebilirlik etiketleri ile `RecentActivities` hata durumu gösterimi tamamlandı.

## A24 — Kalıcı kullanıcı-konu ilerlemesi (16 Ekim 2026)

Yeni `user_topic_progress` tablosu (`UserTopicProgress`, PK userId+topicId, FK CASCADE, durum yalnız `in_progress`/`completed`; satır yoksa `not_started`) ve explicit `006-user-topic-progress` migration'ı eklendi. `GET /api/topics/progress` kullanıcının kendi durumlarını (aktif ve görünür konular için), `PUT /api/topics/:id/progress` `{status}` ile tek konunun durumunu yazar; `not_started` satırı siler. İşlem `services/topicProgress.ts` içinde IMMEDIATE transaction'dadır; görünmeyen/arşivli konu 404, geçersiz durum veya fazla alan 400. Durum global kataloğa yazılmaz, kullanıcılar arası ayrıdır; konu/kullanıcı silinince satırlar temizlenir. `CourseDetailPage` durum düğmelerini sunucuya bağlar (kaydederken devre dışı, hatada toast, sonra yeniden okuma); component belleğindeki `topicStatuses` kaldırıldı. Ortak şema/tipler contracts'tadır.

Düzeltme: önceki not `CoursesPage`'in `studySeconds > 0` buluşsalıyla tamamlanan konu hesapladığını söylüyordu; kodda böyle bir hesap yoktu (`CoursesPage` ilerleme göstermiyor), yalnız `CourseDetailPage` yerel durum kullanıyordu. Ders listesinde ilerleme göstermek yeni ürün kararıdır, eklenmedi.

`npm run check`: **8 contracts + 123 backend + 53 frontend = 184 test**, strict/lint/naming/build başarılı; yeni `topic-progress.test.cjs` kullanıcı ayrımı, görünürlük, silme/arşiv ve cascade'i, yeni component testi sunucu durumunu ve kaydı doğrular. İlk paket sonunda gerçek DB'ye uygulanmayan 006, bu kapanışta native özel snapshot ve bütün eski satırların korunma karşılaştırmasıyla uygulandı; güncel schema yedeği id 6. Tarayıcıda elle doğrulama yapılmadı.

## A18 — Sistem ayarlarının çalışma zamanı (16 Ekim 2026)

- `allowRegistration` kapalıyken `POST /api/auth/register` 403 döner; `RegisterPage` "Kayıtlar kapalı" ekranı gösterir, `LoginPage` kayıt bağlantısını gizler.
- `maintenanceMode` açıkken admin olmayan kullanıcılar `protect` içinde 503 (`Retry-After`) alır; login ve register da 503'tür, admin girişi/erişimi açıktır. Önyüzde `Layout` admin olmayanlara bakım ekranı ve çıkış düğmesi gösterir. Bu iki bayrak artık public ayar DTO'sundadır (`publicSettingsSchema`); diğer private alanlar public değildir.
- `sessionTimeout` boşta kalma süresidir: `rotateAuthSession` son refresh kimliğinin yaşını `max(sessionTimeout, erişim anahtarı ömrü)` ile karşılaştırır, aşılırsa oturumu iptal eder. Refresh tembel (401 sonrası) olduğu için etkin alt sınır 15 dakikadır. Mutlak `SESSION_TTL_DAYS` sınırı değişmedi. Admin ayarlarında alan eklendi.
- `maxStudentsPerCourse` kaldırıldı: derse kayıt/öğrenci üyeliği modeli yok, ayar hiçbir yere bağlanamazdı. Eski saklı satır `readSiteSettings` izinli anahtar listesi dışında olduğundan yok sayılır. Bildirim ayarları (`emailNotifications`/`pushNotifications`) hâlâ yalnız saklanır; teslimat altyapısı yok, ürün kararı gerekir.
- `services/siteSettings.ts` (`readSiteSettings`, `sendMaintenance`) ayar okumanın tek kaynağıdır; `settingsController` onu kullanır. Her korunan istekte ayar tablosu bir kez okunur (ölçüm yapılmadı).

`npm run check`: **8 contracts + 120 backend + 52 frontend = 180 test**, strict/lint/naming/build başarılı. Yeni `backend/tests/runtime-settings.test.cjs` kayıt, bakım ve boşta kalma süresini doğrular. Önyüz ekranları (bakım/kayıt kapalı) tarayıcıda elle doğrulanmadı ve bileşen testi yok. Migration/dependency yok; gerçek DB'de ayar yazılmadı.

## A17 — Admin istatistikleri (16 Ekim 2026)

`GET /api/users/admin-stats` (yalnız admin) kullanıcı/ders sayıları, tüm kullanıcıların ölçülen toplam çalışma/seans/tamamlanan değerleri ve son 5 seansı (kullanıcı adıyla) döner; `AdminDashboardPage` artık yalnız admin'in kendi seanslarına/ilk sayfa kullanıcılara bakmaz. `GET /api/users?includeStats=true` her kullanıcıya `stats` ekler; `AdminUsersPage` N+1 `getUserStats` isteklerini bırakıp bu tek sorguyu kullanır. İki yol `services/studyTracking.ts` içindeki tek sorgulu `getAllTimeSummaries` ve mevcut `measuredTotals` kuralını paylaşır; ortak tipler `UserStudySummary`/`AdminOverview` contracts'tadır. Frontend'deki kullanılmayan `getUserStats` kaldırıldı; `/users/:id/stats` self/admin endpoint'i korunur. Şema/migration değişmedi. `npm run check`: **8 contracts + 117 backend + 52 frontend = 177 test**, strict/lint/naming/build başarılı; yeni backend testi admin yetkisi, toplamlar ve toplu özetleri doğrular. Tarayıcıda elle doğrulama ve yük ölçümü yapılmadı; her iki yol tüm seansları belleğe alır. Gerçek DB'de seed/reset/restore/migration yok.

## Kalıcı Pomodoro

A15 uygulandı: Pomodoro sayfası ve planlayıcı modalı tek usePomodoro/PomodoroTimer kullanır. Faz, döngü, milisaniye kalan süre ve mutlak deadline 005-pomodoro-clocks tablosunda saklanır; tarayıcı callback sayısı süre değildir. Sunucu scheduler'ı fazı kalıcı deadline'da ilerletir. Otomatik mola açıkça seçilir; mola sonunda çalışma kendiliğinden başlamaz. Reload/modal kapatma/rota değişimi sayacı durdurmaz. Eski kayıtta bilinmeyen faz uydurulmaz; kullanıcı sayacı açıkça etkinleştirir.

Komutlar expectedUpdatedAt + ortak IMMEDIATE seans transaction'ıyla yürür; genel planner eylemleri aynı kurala bağlıdır. Gecikmiş worker öncesi GET/stats açık çalışma/mola süresini deadline'da sınırlar ve yazmaz. Reset kullanıcı notunu veya ölçüm geçmişini silmez. Scheduler bakım/restore kapısında durur, yürüyen iş boşaltılır. Hesap anahtarında numeric/string ID normalizasyonu, sürüm/epoch koruması ve yalnız hesap kimliği taşıyan sekme invalidation bildirimi var.

Gerçek yerel 005 yükseltmesi native özel snapshot, eski bütün tablo satırlarının korunma karşılaştırması ve güncel schema manuel backup id 5 ile tamamlandı; seed/reset/restore yok. Tek root dev localhost:3000/API 5002 çalışır. Test/production fixture kanıtı ve sınırlar: implementation/2026-10-16-pomodoro-continuity.md.

## Katalog bütünlüğü

A10 kalan kapsam uygulandı: bütün kategori/ders/konu HTTP yazmaları services/catalog.ts içinde IMMEDIATE transaction kullanır. Ders silmede aktif/pasif konular cascade silinir, seans bağlantıları ve optimistic sürümleri aynı transaction'da güncellenir; seans/not/ölçülen geçmiş korunur. Kategori taşıma ve silme atomik; hedef kendisi/yok/dolu kategori ve görünür ad çakışması denetlenir. Konu silme arşivdir. Reorder bütün aktif liste + expectedTopics sürümü ve 1..N permütasyonu ister; eski/eşzamanlı liste 409, hatalı payload 400. Genel metadata yazmaları last-writer-wins kalır.

Frontend filtreli/azalan/alternatif sıralamada veya pending/refetch sırasında drag açmaz; sunucu onayından önce sıra değiştirmez, hatada liste yenilenir. Katalog yazması ilgili catalog/session cache'lerini yeniler. Konu formunun aynı key'e farklı biçim yazan ikinci sorgusu ve sıra tahmini kaldırıldı. Ortak katalog Zod/tip sözleşmesi eklendi. Schema/dependency migration gerekmiyor.

npm run check: **8 contracts + 99 backend + 44 frontend = 151 test**, atlanan yok; strict/lint/naming/production build başarılı. Production fixture'da klavyeyle sıralama/reload ve konu ekleme; geçici DB'de servis silmesi sonrası 0 ders/0 konu/1 seans/5 dk geçmiş UI'sı doğrulandı. Gerçek DB'de test yazması/seed/reset/restore/migration yok; tek root dev localhost:3000/API 5002 yeniden başlatıldı. Ayrıntı ve sınırlar: implementation/2026-10-16-catalog-integrity.md.

Yeni A24 statik bulgu: CourseDetailPage konu ilerleme düğmeleri yalnız component belleğine yazar, reload ile sıfırlanır. Kalıcı kullanıcı-konu ilerlemesi ayrıca ele alınmalı; global kataloğa kullanıcı ilerlemesi yazılmamalı.

## Gerçek süre ve saat dilimi

A09/A16 uygulandı: plan süresi korunur; SessionInterval çalışma/mola/duraklama aralıkları aynı transaction'da yazılır. 004 eski kayıtları untracked bırakır; ölçüm başlarsa partial, yeni seans complete'dir. Eski plan süreleri ölçülmüş çalışma sayılmaz. Yeniden açma/iptal geçmişi silmez, GET asOf ile salt okunur hesaplar. Pomodoro fazları çalışma/mola ayrımı gönderir; deadline motoru sonraki A15 paketiyle tamamlandı.

Ortak Luxon/IANA sözleşmesi: strict yerel gün, [başlangıç,bitiş) UTC sınırları, gerçek sürenin günlere bölünmesi, 23/25 saat ve belirsiz wall-time reddi. Form ve günlük/haftalık takvim sentetik CalendarDate ile browser timezone'undan bağımsızdır; API'ye gerçek instant dönüşümü zorunlu. Geceyi kesen kart her güne kırpılır. Dashboard/grafik/plan ve aktiviteler measured süre kullanır. Admin kullanıcı satırı gerçek kullanıcıya ait self/admin stats endpoint'inden gelir; global admin dashboard hâlâ açık.

Temiz npm ci ve **125 test (8 contracts / 78 backend / 39 frontend)**, strict typecheck, sıfır uyarılı lint, adlandırma ve production build başarılı. Production fixture: 10 dakika/eski ölçülmemiş süre ayrımı, 18:30 İstanbul formunun 15:30 UTC saklanması ve 18:30 görünümü, 1 dakikalık çalışma → duraklama → mola → complete. Gerçek yerel 004 yükseltmesi private native snapshot + eski bütün satır karşılaştırması + yeni schema yedeği id 4 ile tamamlandı; seed/reset/restore yok. Detay: implementation/2026-10-16-study-time-and-timezones.md.

## Atomik seans ve durum bütünlüğü

A07/A08 uygulandı: create/move/resize/yeniden etkinleştirme aynı IMMEDIATE transaction ve [start,end) kontrolünde; çakışma 409. Bütün HTTP yazmaları ortak service içindedir. Ortak durum tablosu, tek aktif seans, completedAt/idempotent no-op ve zorunlu expectedUpdatedAt eski yazma koruması var. Paused/completed aralığı korur, cancelled serbest bırakır. Tarihsel hatalı kayıtlar topluca değiştirilmedi; şema değişmedi.

Frontend bütün mutation'larda görülen snapshot sürümünü taşır; 409 ilgili session cache'lerini yeniler. Pomodoro yanıtları güncel snapshot olur, ana pause düğmesi sunucuda da duraklatır. Süre bittiğinde GET'in otomatik iptal edeceğini varsayan polling kaldırıldı. Bu paket kapanışında A09/A15/A16 açıktı; sonraki gerçek süre paketinde A09/A16 ele alındı. A15 deadline/tek motor sonraki pakette tamamlandı.

Son npm run check: **108 test (5 contracts / 67 backend / 36 frontend)**, strict typecheck, sıfır uyarılı lint, adlandırma ve production build'ler başarılı. Gerçek HTTP/SQLite yarışları, rollback, sürüm/durum/ilişki matrisi ve UI transport/component regresyonları var. Atılabilir production tarayıcı fixture'ında ikinci aktif seans reddi, gerçek pause/resume/complete doğrulandı. Ayrıntı: implementation/2026-10-16-session-integrity.md. Gerçek DB'de migration/seed/reset/restore yok.

## Tercihler, hesap sınırları ve site kimliği

Admin paneli kontrol edildi; /admin/settings genel ayarlarındaki ad/açıklama/logo/ikon ortak Brand, auth ekranları, sidebar/loading ve title/meta/favicon'a bağlandı. Görünen ürün adı teknik repo/paket adından bağımsızdır. Gerçek site adı değiştirilmedi; yeni isim yalnız fixture'da denendi.

Ortak contracts workspace ve Preferences v1; explicit 003 migration/arşiv; server-confirmed sıralı kayıt, hata/pending ve hesap sınırı; hesaplı okundu bildirimleri ve kişisel Pomodoro varsayılanı uygulandı. Query factory tüm kaynakları kullanıcıya; günlük/haftalık session görünümlerini tarih/timezone'a bağlar. Mutation invalidation bütün ilgili özetlere gider. Public/private ayarlar ayrıldı; yazmalar şemalı/transaction'lıdır.

Temiz npm ci ve 86 test/typecheck/lint/build başarılı. Fixture tarayıcı kontrolü; gerçek yerel DB'de önce private snapshot, sonra normal migration 003, kimlik/hash/oturum/kayıt korunma kontrolü ve yeni schema backup id 3 tamamlandı. Reset/restore/seed yapılmadı. Detay: implementation/2026-10-16-preferences-and-site-identity.md.

## Önceki oturum ve kurtarma paketi

İptal edilebilir session/refresh rotasyonu, cookie/CSRF, frontend ortak refresh ve geç yanıt/çevrimdışı logout izolasyonu tamamlandı. Admin oluşturma/kurtarma CLI eklendi. Native SQLite snapshot/restore, manifest/checksum/şema kontrolü, güvenlik snapshot'ı/rollback ve transaction'lı reset uygulandı. Otomatik yedek aralığı her kontrolde okunur ve geçen tam güne göre işler.

Kullanıcı ilk kurulum istedi: yeni ortam/DB ve admin@example.com hesabı oluşturuldu; özel parola dosyası `.local/admin-password.txt` (0600, Git dışında). Gerçek yerel DB'de giriş/reload/manual backup doğrulandı; reset/restore/seed yapılmadı. Tek dev süreci localhost:3000/API 5002'de bırakıldı. Uygulama ve geçiş sınırları `implementation/2026-10-15-security-and-recovery.md` içindedir.

## Tasarım paketi

Güncel resmî Geist/Linear örnekleri incelendi; sade nötr ürün dili uygulandı. Ortak kabuk/kontroller ve ana kullanıcı ekranları yenilendi; eski pastel/cam/gradyan yönü geçersiz. Kalıcı kararlar, kapsam ve doğrulama `design-system.md` içinde.

Son aktivitelerin zaman sırası, dashboard konu verisi/sayıları, query response uyumu ve günlük özetin cache mutasyonu da düzeltildi. Gerçek çalışma süresi ve admin istatistikleri açık; Preferences senkronu sonraki 16 Ekim paketinde düzeltildi.

## Doğrulananlar

| Kontrol | Güncel durum |
|---|---|
| Temiz npm ci | Başarılı, kök lock ile |
| İngilizce/ASCII teknik adlandırma | Kural kaydedildi; otomatik ASCII kontrolü geçti, anlam incelemesi ayrı |
| Backend/frontend typecheck | Başarılı, strict korunuyor |
| Lint | ESLint 10 flat config, sıfır uyarı |
| Ortak sözleşme test | 18 test; strict auth/patch/query/Plan/backup ve ortak gerçek süre sınırları dahil; managed-user create kuralları dahil; timezone/DST ve Preferences, ayar şemaları ve seans geçiş/yazma sözleşmeleri |
| Backend test | 143 test; test süreçlerinde yerel dotenv yüklenmemesi dahil; HTTP/SQLite normalizasyon, DTO, sparse patch, Plan yarış/detach/geçmiş/sürüm/rollback dahil; kullanıcı sayfalama/arama/create ve öz-koruma dahil; restore ad çakışması/yarışı ve geçmiş koruma dahil; admin agregasyonları/runtime ayarları/kullanıcı-konu ilerlemesi dahil; Pomodoro deadline/faz/yarış/migration/bakım regresyonları, arşivlenmiş ders/konu ilişkisi koruma ve ilişki temizleme (`null`), katalog `isActive=all` ve arşivlenmiş konu adı yeniden kullanımı, admin kendi hesabını koruma ve base64/null profil fotoğrafı regresyonları dahil |
| Frontend test | 200 test; kısa kart sütunları/saat sınırı/gün sonu/menü ve sub-minute konum regresyonları dahil; Header hata/boş/stale/epoch ve popover odak, takvim klavye/saat/süre/409/read retry regresyonları dahil; ortak auth form/gerçek HTTP malformed response ve geç parola hesap sınırı, 1/1.5/1440 dakika form regresyonları dahil; yönetim özeti ve günlük seans/editör async/409/taslak/epoch regresyonları dahil; ayar taslağı/patch/private read yarışları ve backup async/epoch/kurtarma sınırları dahil; kullanıcı yönetimi/oluşturma, sunucu onayı ve hesap sınırları dahil; kategori yönetimi/hata/retry/hedef seçimi ve nested dialog/epoch dahil; ortak katalog create/edit, yetki/dirty patch/pending/epoch ve arşiv/restore regresyonları dahil; ortak drag/resize/409/retry/epoch ve async dialog regresyonları dahil; sunucuya bağlı konu ilerlemesi dahil; ortak timer, gecikmiş callback/yanıt, hesap ayrımı, iki planner erişim ve haftalık takvim kartından düzenleme modalı açma regresyonları dahil; katalog transport/cache ve sıralama component regresyonları dahil; takvim alanları/gece yarısı/Pomodoro fazı ve sürümlü seans transport ve iki Pomodoro yüzeyinin sunucu onayı, auth/cache/çevrimdışı logout, tercih/kayıt/kullanıcı/tarih/bildirim/branding, gerçek HTTP refresh, hata sınırı ve sıralama |
| Backend/frontend production build | Başarılı, Vite 8 |
| Production bundle tarayıcı smoke | Dolu geçici veride giriş/dashboard/dersler, planner/özet, arama, mobil özel seans oluşturma; açık/koyu görünüm |
| GitHub CI | Workflow eklendi; uzak koşum yapılmadı |
| Yerel ilk kurulum | Açık kullanıcı yetkisiyle configure/migration/admin oluşturma; giriş/reload/manual snapshot başarılı; reset/restore/seed yok |
| Mobil manuel kontrol | 390×844; günlük görünüm, menü, Escape/odak, arama ve form; yatay sayfa taşması yok |
| Otomatik tarayıcı E2E | 18 davranış + 18 erişilebilirlik yürütmesi =36 başarılı; 150 axe taraması/0 violations (target-size dahil), incomplete kayıtlar korunur; uzak CI yok |
| Lighthouse | Login/dashboard × desktop/mobile ×3 =12 ölçüm; accessibility 100, performance96/67 ve92/61; mobil 90+ açık, yerel fixture saha verisi değildir |
| Tam WCAG / fiziksel cihaz / yük | Açık; incomplete/ekran okuyucu/gerçek cihaz ve kapasite ayrıca doğrulanmalı |

## Audit durumları

| Bulgu | Durum / kanıt sınırı |
|---|---|
| A01 | Ders/konu/kullanıcı okuma kapsamı düzeltildi; owner/other/admin HTTP matrisi var. |
| A02 | Sabit secret fallback kaldırıldı; env doğrulama ve güvenli development seed eklendi. Gerçek dağıtım anahtarı/oturum yenilemesi yapılmadı. |
| A03 | Tek DB yolu uygulandı; snapshot'ın aynı geçici DB'deki kayıtları içerdiği doğrulandı. |
| A04 | Tek süreç kapsamında native WAL snapshot/atomik restore, manifest/checksum/şema kontrolü, safety/rollback, bakım kapısı ve geçen gün planı testli. Offsite/kapasite/retention ve gerçek ortam kurtarma tatbikatı açık. |
| A05 | GET durum/not değiştirmiyor; tekrar okuma regresyonu var. Zaman aşımı ürün politikası ayrı iş. |
| A06 | Yeni oturumların ders/konu yetkisi, eşleşmesi ve aktifliği doğrulanıyor; mevcut oturumda sonradan pasife alınan ders/konu bağı düzenlemede korunuyor ve `null` ile temizlenebiliyor. Tarihsel hatalı ilişkiler gerçek DB'de taranmadı. |
| A07/A08 | Uygulandı/testli: IMMEDIATE create/move/resize/yeniden etkinleştirme; ortak durum politikası, tek aktif seans, stabil completedAt, zorunlu optimistic sürüm ve stale 409. Tarihsel çakışmalar/harici SQL ayrı kapsamdır. |
| A09 | Uygulandı/testli: ayrı ölçülen aralıklar, study/break/pause, kayıpsız 004/coverage, gerçek süre özetleri; 5+3+5 dakika ve rollback. İnsan varlığı/offline geriye dönük ölçüm iddiası yok. |
| A10 | Uygulandı/testli: reset safety/transaction ve ortak IMMEDIATE catalog servisi; atomik kategori taşıma/silme (+ `AdminCoursesPage` üzerinde kategori taşıma/silme UI'ı), FK/sürüm ile geçmişi koruyan ders silme, soft topic delete, arşivlenmiş konu adını yeniden kullanabilme, `isActive=all` listeleme ve sürümlü tam reorder. Hata enjeksiyonu ve eşzamanlı HTTP/SQLite regresyonları var; harici SQL domain kapsamı dışındadır. |
| A11 | Uygulandı/testli: ortak v1 sözleşme, explicit legacy JSON migration/arşiv, tam round-trip, sıralı ve sunucu onaylı kayıt, hata ve hesap sınırı. Dil/bildirim/süre tercihi saklamak ilgili ürün altyapısının tamamlandığı anlamına gelmez. |
| A12 | Yerel check: 361 workspace testi + 36 browser yürütmesi ve 12 Lighthouse ölçümü başarılı; strict/lint/build ve CI browser kapısı var. Uzak CI koşumu ve bütün ürün E2E kapsamı ayrıca açık. |
| A13 | Uygulandı/testli: DB session, hash'li refresh rotasyonu/replay iptali, cookie/CSRF, logout/parola/rol iptali, ortak refresh ve geç yanıt izolasyonu. Production cookie dağıtımı ayrıca doğrulanmalı. |
| A14 | Tanımlı kapsam uygulandı/testli: ortak account/resource/date/timezone key factory, kategori önbellek şekli uyumu, ilgili özetlere invalidation, gün anahtarı yenileme, memory-only tercihler, hesaplı bildirim geçmişi, profil/admin geç yanıt sınırı. Backend timezone doğruluğu sonraki A16 paketiyle tamamlandı. |
| A15 | Uygulandı/testli: kalıcı sunucu deadline/faz/döngü, ortak timer hook/UI, reload/modal/çoklu sekme, sürüm/epoch koruması; gecikmiş worker ölçümü deadline ile sınırlı. Otomatik mola opt-in; otomatik çalışma yok. Yük/çok süreç operasyonu ayrıca doğrulanmalı. |
| A16 | Uygulandı/testli: ortak timezone sınırı/form/takvim, kesişimli okuma ve günlük gerçek süre; UTC/İstanbul/New York ve DST 23/25 saat. Grid tekrarlanan saat için ayrı satır üretmez; kapsamlı DST pointer/E2E A22 altında açık. |
| A17 | Uygulandı/testli: global admin özet endpoint'i ve dashboard, `includeStats` ile toplu kullanıcı istatistikleri (N+1 kalktı), all-time ölçülen süre. Büyük veri performansı ölçülmedi. |
| A18 | Uygulandı/testli (API); UI elle doğrulanmadı: allowRegistration, maintenanceMode (admin hariç 503), sessionTimeout (boşta süresi, alt sınır 15 dk). maxStudentsPerCourse kaldırıldı (model yok). **Açık:** bildirim teslimatı yok, ürün kararı gerekir. |
| A19 | Tanımlı kapsam tamamlandı: Sequelize hata çevirisi, ortak auth/profile/admin create-update/list query/Plan/backup şemaları; normalize request değerleri; tek güvenli userResponse ve istemci auth/admin/backup runtime DTO; ortak validation hata ayrıntısı. Joi/Zod 3 aktif yolları kaldırıldı. Plan isteğe bağlı hedef kabı, takvim StudySession; kullanılmayan istemci Plan motoru kaldırıldı. Plan IMMEDIATE create/update/reactivation/detach-delete ve rollback testli; geçmiş korunur. Bütün diğer API yanıtlarını runtime şemaya taşıma veya bütün metadata'ya optimistic version ekleme iddiası yoktur. |
| A20 | Lock, modern dev araçları, güvenli setup, üç workspace ve açık 001–006 migration var. Legacy şema evrimleri için sonraki explicit migration'lar gerekiyor. |
| A21 | Kısmen: yedi ölü modül/eski script/paket kaldırıldı; route splitting tamam; iki timer motoru ortaklaştırıldı; `WeeklyPlanner` ve `DailyCalendar` etkileşim hataları düzeltildi. PlannerCalendar/usePlannerCalendar/kart/geometry ile iki takvim motoru birleştirildi; drag/resize/409/epoch ve async dialog testli. Öğrenci özel ders/konu edit/delete/archive/restore UI, tek öğrenci/admin ders editörü ve nötr ders yüzeyleri tamam. Kategori ve kullanıcı yönetimi/shared editor ve async onaylar da tamamlandı. Ayar/yedekleme taslak/dirty patch/read error/async onay/epoch da tamam. Yönetim özeti/günlük seans/editör/Pomodoro nötr yüzey ve işlem sınırı denetimi de tamamlandı; 73/73 kaynak modül erişilebilir. **Kalan sınırlar:** büyük formun sözleşme/alan sınırları A19, performans ve kapsamlı erişilebilirlik/E2E A22 altında açıktır. |
| A22 | Kısmen: ErrorBoundary, mobil Dialog odak/Escape, `MoveSessionModal` klavye/etiket erişilebilirliği, skip link, reduced-motion ve 390 px manuel kontrolü var. Header hata/boş/stale ve Popover odak/Escape; ortak takvim tek Tab/ok gezinmesi ve native saat/süre alternatifi tamam/testli. Kısa komşu kartlar min 28 px/sütun yerleşimi ve gün sonu odak boşluğuyla doğrulandı. İlk otomatik E2E alt paketi 6 senaryo/18 yürütmeyle tamamlandı; kapanış sonrası odak yarışı düzeltildi. **Son ek:** 150 axe/0 violations (WCAG 2.2 target-size dahil), 12 Lighthouse ölçümü (accessibility 100; mobil performance67/61) tamam. **Eksikler:** mobil ilk yük optimizasyonu, incomplete/ekran okuyucu/grafik veri alternatifi, fiziksel cihaz, DST fold, geniş admin/Pomodoro/native drag-resize E2E ve bootstrap interrupt cleanup. |
| A23 | Yeni kullanıcı gereksinimi uygulandı: bütün görünen site adı/admin kimlik ayarları ortak kaynaktan değişir; repo/domain değiştirmez. |
| A24 | Uygulandı/testli: 006 migration, kullanıcıya özel `user_topic_progress`, GET/PUT uç noktaları, `CourseDetailPage` sunucu bağlantısı. Yerel 006 özel snapshot/veri koruma kontrolü ve schema backup id 6 ile uygulandı. Tarayıcı elle doğrulaması ayrıca açık. |

## Bağımlılıklar

Ortak timezone/takvim hesabı Luxon 3.7.2 kullanır; tipler 3.7.6. Üç workspace Zod 4.6.7 kullanır; Joi ve son Zod 3 form yolu A19 ile kaldırıldı. Kök dev/build/check sözleşmeleri derler; Vite linked contracts workspace'ini optimize eder; Zod major ayrımı kaldırıldı.

Node 24.21.0, npm 11.19.0; Vite 8.3.4, plugin-react 6.1.2, ESLint 10.12.0, typescript-eslint 8.71.2, Vitest 5.0.4, sqlite3 6.0.1, tsx 4.23.15. TypeScript 5.9.3 sabit; React 18/Recharts 2/Router 6/Tailwind 3 dönüşümleri tamamlanmadı.

İlk mühendislik paketinde lock audit sonucu: 12 paket düğümü (0 critical / 5 high / 7 moderate). Başlangıçta bağımsız manifest çözümlemeleri kullanıldığından eski sayılarla doğrudan yüzde karşılaştırması yapılmaz. Aynı advisory birden fazla düğümü etkileyebilir. Bunlar açık iş olarak tutulur.

## Eksik ve tamamlanacak işler (Kaldığımız yerden devam listesi)

1. **A22 — Klavye/Dokunmatik, Hata Durumları ve Otomatik E2E:**
   - Header hata/boş/stale ve popover odak/Escape; takvim tek Tab/ok gezinmesi ve native saat/süre alternatifi tamam/testli.
   - Kısa komşu kart/saat sınırı/gün sonu yerleşimi tamam/testli.
   - İlk gerçek browser E2E kapısı tamam: 6 senaryo/18 yürütme; CI adımları tanımlı, uzak koşum açık.
   - Otomatik axe/Lighthouse tabanı tamam: 150 tarama/0 violations ve 12 ölçüm. Mobil ilk yük 67/61→90+ hedefi sıradaki öncelik.
   - Incomplete/ekran okuyucu/grafik veri alternatifi, fiziksel cihaz/DST fold/geniş admin-Pomodoro-pointer E2E ve bootstrap interrupt cleanup açık.
2. **A04 ve Bağımlılıklar:**
   - Yedek saklama/offsite, kapasite/yük ve kurtarma operasyonları; kalan güvenlik ve major bağımlılık güncellemeleri açık.
3. **Genel bakım sınırları:**
   - Seans editörünün kalan render alanlarının daha küçük bileşenlere ayrılması, diğer API yanıtlarında runtime DTO kapsamı ve mevcut any borcu; yeni Plan ekranı ayrı ürün kapsamıdır.

A21 admin/modal/today alt kapsamı tamamlandı. Önceki kategori/kullanıcı/ayar-yedekleme/katalog ve ortak planner yeniden uygulanmayacak. Bütün bakım/performance işi tamamlandı iddiası yoktur.

Her iş ilgili davranış testi, gerekli kontroller ve memory-bank güncellemesiyle kapanır. İnceleme raporu tarihsel kalır; güncel durum bu dosyadan izlenir.
