# Tercihler, Hesap Sınırları ve Site Kimliği — 16 Ekim 2026

## Kapsam ve karar

Kullanıcı site adının tamamen değiştirilebilmesini, admin panelinin kontrol edilmesini ve sıradaki pakete devam edilmesini istedi. Admin paneli zaten vardı: `/admin`, `/admin/users`, `/admin/courses`, `/admin/settings`. Yeni bir panel kopyası oluşturulmadı. Mevcut genel ayarların site kimliğiyle bağlantısı tamamlandı; A11 ve A14'ün tercih/cache kapsamı uygulandı.

Görünen ürün adı admin ayarıdır; Git deposu, teknik paket/dosya adları ve hosting alan adı bundan bağımsızdır. Gerçek yerel site adı kullanıcı adına seçilmedi. “Odak Atlası” yalnız atılabilir tarayıcı fixture'ında kullanıldı.

## Ortak sözleşme ve geçiş

`packages/contracts`, Zod 4 runtime şeması ve türetilmiş tipleri backend/frontend'e sağlar. Tek TypeScript kaynak CJS/ESM çıktısı üretir; iki ayrı uygulama değildir. Kök dev/typecheck/test ve workspace build girişleri gerekli sözleşme build'ini yapar. Vite, bağlı workspace'i kendi Zod major'ıyla optimize eder; development başlangıcında `--force` eski export cache'ini temizler. Frontend'in diğer Zod 3/RHF formları henüz topluca taşınmadı.

Preferences v1: theme light/dark/system, nullable customPrimaryColor, üç bildirim tercihi, Pomodoro/mola/döngü varsayılanları, saat cinsinden günlük/haftalık hedef, aktif hafta günleri (0=Pazar), language/timezone ve studyField. Geçerli IANA timezone, hex renk, sayısal sınır/tam sayı ve tekil günler doğrulanır. Patch bilinmeyen alanları ve desteklenmeyen schemaVersion değerlerini reddeder. Language alanının saklanması İngilizce arayüz uygulandığı anlamına gelmez.

Açık `003-user-preferences-v1` migration, eski notifications/workGoals/studyGoals ve düz alanları dönüştürür. Düz alanlar önceliklidir; geçersiz/eski değerler kaynak JSON ile `legacyPreferences` arşivinde korunur. Bilinmeyen gelecek sürümü veya bozuk JSON migration'ı durdurur; bütün transaction geri döner. Kullanıcı kimliği, parola hash'i ve diğer kayıtlar değişmez. Yeni kullanıcılar doğrudan canonical v1 alır. Auth/admin kullanıcı yanıtları yalnız canonical alanları döndürür; arşiv JSON'u API'ye çıkmaz.

`/auth/profile` ve admin kullanıcı güncellemesi, güncel satırı SQLite IMMEDIATE transaction içinde yükleyerek kısmi tercih yamalarını birleştirir. Farklı alanlara eşzamanlı yazmalar kaybolmaz; aynı alanda son yazma kazanır. Genel DTO dönüşümü bütün API'ler için tamamlanmış değildir.

## İstemci ve kullanıcı sınırı

Kişisel tercihler sunucuda kalıcı, istemcide yalnız mevcut hesabın belleğindedir. Kayıtlar sıraya alınır; önceki sunucu onayı korunur ve başarı ancak response doğrulandıktan sonra gösterilir. Hata/pending durumları ekranda görünür. Hesap generation kontrolü geç yanıtları ve başka hesaba taşınacak kuyruk yazmalarını engeller. Profil ekranlarının doğrudan setUser response yolu da epoch kontrollü authStore işlemine taşındı. Profil ve tercih HTTP yazmaları ortak transport kuyruğundadır. Monoton tercih revision kontrolü, geç gelen eski refresh/profil snapshot'ının aynı hesapta yeni onaylanmış tercihi ezmesini engeller; açık tercih patch'inin sıralı sunucu onayı kendi alanları için yetkilidir. Layout kimlik değişiminde yeniden kurulur; form/timer UI state'i yeni hesaba taşınmaz.

Eski kullanıcıdan bağımsız browser preference/readNotifications değerleri otomatik olarak yeni hesaba atanmaz. `unassigned-account-state` içinde manuel kurtarma için arşivlenir, uygulama bunları okuyup uygulamaz. Arşiv yazılamazsa kaynak değerler silinmez. DB'deki canonical tercih baskındır. Yeni okundu bildirimleri `read-notifications:<userId>` anahtarında en fazla 500 id saklar; bozuk veri ve storage olayı ele alınır. Bildirim gönderim altyapısı eklenmedi.

Tema ve renk tek appearance katmanında uygulanır; custom renk kaldırılınca site rengine dönülür, system tema OS değişimini dinler. Yeni seans formu kişisel Pomodoro varsayılanlarını kullanır; mevcut seansın kaydedilmiş ayarı önceliklidir. İki timer motorunun durum/süre doğruluğu bu pakette birleştirilmedi.

Query anahtarları tek factory ile account id, kaynak/filtre, ilgili tarih ve session'larda timezone taşır. Session yazmaları o kullanıcının günlük/haftalık/Pomodoro/dashboard/aktivite/bildirim görünümlerini ortak prefix ile invalidate eder. Catalog yazmaları liste/detay/kategori kapsamını yeniler; eski yanlış optimistic topic key'i düzeltildi. Güncel gün anahtarı 30 saniyede ve focus'ta yenilenir; haftalık özet gün değişiminden yeniden türetilir. Bu, backend timezone aralığı/gerçek süre sorununu (A16/A09) çözmez.

## Site kimliği ve ayarlar

Admin genel ayarlarındaki siteName/siteDescription/siteLogo/siteIcon; ortak Brand, login/register, sidebar, loading, document title, description/application-name/og:site_name ve favicon'a bağlandı. HTML başlangıç başlığı nötrdür; tek varsayılan ürün adı contracts içindedir. Eski ikon adları korunur; güvenli HTTP(S) logo/ikon URL'leri kabul edilir. Yerel ikon SVG'leri mevcut Lucide setinden üretildi; lisansı assets yanında korundu. Gizli bir yeniden adlandırma veya domain değişimi yapılmaz.

`GET /settings` yalnız izinli public branding DTO'su döndürür. `GET /settings/admin` ve `PUT /settings` admin gerektirir, private veri kalıcı browser cache'ine yazılmaz. Eski public `/settings/category/:category` yolu kaldırıldı. Ayar yamaları ortak şemada bütünüyle doğrulanır, tek transaction'da yazılır; iç hata detayları response'a çıkmaz. Bilinmeyen mevcut DB ayarı silinmez, API'ye açılmaz.

Public branding cache'i kişisel veri içermez. Sayfa açılışı, focus ve görünür sayfada 60 saniyelik yenileme site değişikliğini getirir; geç eski GET yeni kaydı ezemez. Admin kaydı aynı istemcide hemen görünür. CSR metadata değişikliği sunucu tarafında SEO render hizmeti değildir.

A18 bütünüyle kapalı değildir: allowRegistration, maintenanceMode, sessionTimeout ve bazı bildirim/kapasite ayarlarının sunucuda uygulanması sonraki iştir. Public/admin ayrımı, izinli tipler ve atomik yazma bu pakette tamamlandı.

## Doğrulama ve operasyon

Temiz `npm ci` başarılı. Son `npm run check`: **3 contracts + 52 backend + 31 frontend = 86 test**, atlanan yok; strict typecheck, sıfır uyarılı lint, adlandırma ve iki production build başarılı. Lock audit hâlâ 12 paket düğümü (5 high/7 moderate); önceki bağımlılık backlog'u açık. Uzak CI/deployment/commit/push yapılmadı.

Testler: eski JSON'un arşivle dönüşümü ve tekrar migration; desteklenmeyen sürümde toplu rollback; bütün tercihlerin round-trip'i; kullanıcı/admin eşzamanlı patch ve hesap izolasyonu; invalid veri reddi; public/private ayar matrisi ve ara upsert hatasında rollback; sıradaki/başarısız/geç istemci kayıtları; geç profil/admin response'u, aynı hesapta eski refresh snapshot'ı ve farklı çağrılardan sıralı gerçek HTTP profil yazmaları; kullanıcı/tarih/timezone query kapsamı; gece yarısı ve bildirim ayrımı; sahipliği bilinmeyen browser verisinin korunması.

Tarayıcı: ayrı `127.0.0.1:3001` frontend / `5003` API, geçici SQLite ve iki fixture hesabı. Site adı/açıklama/ikon kaydı bütün yüzeylerde doğrulandı; koyu tema reload ile korundu; ikinci hesap system tercihiyle açıldı ve admin menüsü görünmedi. Öğrencinin 35 dakikalık Pomodoro tercihi yeni seans formunda 35 geldi. Test sırasında Vite'ın iki farklı Zod major'ını karıştırması ve yeni workspace export'unu eski cache'den okuması yakalandı; workspace optimization ve temiz dev başlangıcıyla giderildi. Fixture kendi ayrı Vite cache'iyle çalıştırıldı. Test hesabından çıkıldı; sekme/sunucular kapatıldı, geçici DB temizlendi. Bu manuel smoke, otomatik tam tarayıcı E2E değildir.

Gerçek yerel yükseltme doğrulama için veri sıfırlamadan yapıldı: geliştirme süreçleri durduruldu; native SQLite API ile `.local/before-preferences-<uuid>.sqlite` kopyası ve integrity/FK kontrolü; explicit `npm run db:migrate`; kimlik/parola hash/oturum ve tablo kayıt sayılarının korunma karşılaştırması; yeni şemayla manuel backup (id 3). Kopyanın yolu `.local/preferences-upgrade-2026-10-16.json` içinde; ikisi Git dışında/private. Reset/restore/seed çalıştırılmadı. Güncel yerel sunucu başlatıldı; korunan gerçek admin oturumuyla dashboard ve genel ayarlar salt okunur doğrulandı. Önceki şemalı yedekler dosya olarak korunur; current restore şema kontrolü bunları reddeder. Eski yedeği kullanmak önce uyumlu sürümle/ayrı kopyada kontrollü migration gerektirir; restore sırasında sessiz şema dönüşümü yapılmaz.

Görsel kanıtlar repo dışında aynı Codex artifact dizininde: site-identity-settings.jpg, preferences-persisted.jpg, personal-pomodoro-default.jpg. Hepsi fixture verisi içerir.

## Sıradaki kapsam

A07/A08 atomik zaman çakışması ve ortak StudySession durum makinesi; A09 planlanan/gerçek süre ayrımı; A16 timezone aralıkları; A10 diğer çok adımlı silme/sıralamalar. Ardından tek timer/planner motoru, A17 admin agregasyonları, kalan A18 uygulaması, bağımlılık geçişleri, otomatik E2E/erişilebilirlik ve kurtarma operasyonları.
