# Oturum ve Kurtarma Paketi — 15 Ekim 2026

## Talimat ve kapsam

Kullanıcı admin parolasını unuttuğunu söyledi ve sonraki pakete devam edilmesini istedi. Klasörde ortam/veritabanı bulunmadığı doğrulandıktan sonra “Henüz kurulum yapmadım; yerel admin oluşturulsun” yanıtıyla ilk kurulum açıkça yetkilendirildi. Eski hesap parolası bulunmadı veya geri çıkarılmadı; yeni yerel hesap oluşturuldu.

Paket: iptal edilebilir oturum, refresh rotasyonu, güvenli admin CLI, tutarlı SQLite snapshot/restore, transaction'lı reset ve gerçek geçen süreye göre otomatik yedekleme. Türkçe ürün metinleri korunur; yeni teknik adlar İngilizcedir. Önceki temel/tasarım değişiklikleri korunmuştur. Commit/push/deployment yapılmadı.

## Oturum mimarisi

- Açık `002-auth-sessions` migration: AuthSession ve RefreshCredential; kullanıcı/session ilişkileri FK cascade. Eski 001 uygulanmış, veri içeren geçici DB'nin yükseltmesi regresyonla doğrulandı.
- Access JWT yalnız kullanıcı id + UUID session id taşır; HS256, issuer ve audience açık doğrulanır. Yetki ve aktiflik her korumalı istekte DB'den gelir. Süre en fazla 15 dakika.
- Refresh rastgele 32 bayt opaque credential; yalnız SHA-256 hash DB'ye yazılır. HttpOnly, SameSite Strict, `/api/auth` cookie; production Secure/HTTPS. JSON ve localStorage içinde refresh/access kalıcılığı kaldırıldı. Eski auth-storage anahtarı temizlenir.
- Refresh, SQLite IMMEDIATE transaction içinde tek kullanımlık rotasyon yapar. Tüketilmiş credential tekrar kullanılırsa aile iptali transaction içinde **commit edilir**; exception ile rollback edilmez. Mutlak session ömrü yenilemede uzamaz; tüketilmiş hash geçmişi session süresi bitene kadar tutulur.
- Logout session ailesini, parola değişikliği/admin kurtarma bütün kullanıcı oturumlarını iptal eder. Rol/aktiflik değişimi de revocation yapar. Yeni login ve parola değiştirme, transaction içinde doğrulanmış hash'in hâlâ güncel olduğunu denetler; eski parola doğrulamasının yeni paroladan sonra session üretmesi engellenir.
- Bütün auth route'larında özel istek başlığı ve Origin/Sec-Fetch-Site denetimi; auth ve korumalı yanıtlar no-store. Yeni parolalar en az 12 karakter/en fazla 72 UTF-8 bayt; bcrypt maliyeti 12–16. Var olan daha kısa parolayla giriş ayrı doğrulama yolunda kalır.
- Frontend tek refresh promise, epoch/kimlik kontrolü, geç gelen 401 için güncel token'ın kullanılması, retry sınırı ve hesap cache temizliği uygular. Refresh başka kullanıcı döndürürse eski isteği yeni kimlikle tekrar etmez.
- Logout geç refresh'i bekleyerek cookie'yi sunucuda iptal eder. Ağ hatasında yalnız gizli bilgi içermeyen logout-pending niyeti tutulur; yeniden açılış otomatik refresh yerine logout dener. Web Locks cookie değişikliklerini sekmeler arasında sıraya koyar; BroadcastChannel kimlik/cache değişimini diğer sekmelere bildirir. Web Locks bulunmayan tarayıcı fallback'i sekmeler arası aynı garantiyi vermez.

Oturum saklama ve cookie nitelikleri için [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) incelendi. Bunlar bu uygulamanın kararlarıdır; tam güvenlik denetimi yerine geçmez.

## Admin oluşturma/kurtarma

`npm run admin:manage -- --mode create|recover --email EMAIL --username NAME --password-file /absolute/private/path`

CLI yalnız hazır, var olan DB'de çalışır. Parola küçük, düzenli ve 0600 izinli dosyadan okunur; argümanda veya stdout'ta açılmaz. Create hiçbir admin yokken çalışır. Recover yalnız tam e-postayla bulunan aktif admini günceller; öğrenciyi yükseltmez; transaction içinde session'larını iptal eder. Başka kullanıcı verisine/örnek kategoriye dokunmaz. Testler aynı kısıtları ve diğer hesapların korunmasını doğrular.

## Snapshot, restore ve bakım

- fs.copy/process.exit yolları ve kullanılmayan fs-extra paketi kaldırıldı. Mevcut sqlite3 native Online Backup API kullanılır. [SQLite Online Backup API](https://sqlite.org/backup.html) ve [VACUUM INTO](https://www.sqlite.org/lang_vacuum.html) incelendi; açık bağlantı/WAL ile destination transaction desteği nedeniyle mevcut sürücünün backup API'si seçildi.
- Tek süreç bakım kapısı yeni istekleri 503/Retry-After ile durdurur ve yürüyen HTTP yanıtlarının bitmesini bekler; mevcut yönetim isteği hariçtir. Timeout/çakışma kilidi finally ile bırakır. Cron da aynı kapıyı kullanır. Çoklu backend veya harici doğrudan SQLite yazıcısı bu koordinasyona dahil değildir.
- Snapshot önce `.partial` dosyasına alınır. Integrity, FK ve gereken migration/model kolonları doğrulanır; SHA-256, boyut, fsync ve rename uygulanır. UUID dosya adları doğrulanır; yeni dizin 0700, snapshot/manifest 0600.
- JSON manifest snapshot'ın yanındadır; DB içindeki katalog tek kaynak değildir. Başlangıç/restore sonrası katalog manifestlerden upsert edilir. Eksik/bozuk manifest envanteri sağlıklı DB'nin açılmasını engellemez; yalnız güvenli dosya adıyla loglanır. Liste manifest/kimlik/boyut kontrolü yapar; tam checksum ve DB doğrulaması restore öncesinde yeniden yapılır. “Doğrulanmış” etiketi sürekli bit çürümesi taraması anlamına gelmez.
- Restore kaynak kimlik/checksum/boyut/integrity/FK/şema kontrolünü **canlı veriyi değiştirmeden önce** yapar. Mevcut verinin ayrı güvenlik snapshot'ını oluşturur; native destination transaction ile mevcut dosyaya yükler. Sequelize pool kapatılmaz, sunucu öldürülmez. Son şema/katalog doğrulamasından sonra bütün geri gelen session'lar iptal edilir.
- Son kontrol başarısızsa güvenlik snapshot'ı native restore edilir. Kurtarma da başarısızsa health/API bakım durumunda kalır; erişim fail-closed olur. Gerçek disk kaybı/process crash tatbikatı yapılmadı.
- `settings_only` yalnız Settings tablosunu temizler. `all`, öğrenci/ders/çalışma verilerini temizler, admin ve backup kayıtlarını korur. İki yol önce güvenlik snapshot'ı alır ve silmeleri IMMEDIATE transaction içinde yürütür. Diğer catalog silme/sıralama transaction sorunları hâlâ açık.
- Cron 5 dakikada bir çalışır; her koşumda 1/5/7 günlük ayarı okur ve son başarılı otomatik manifest zamanından itibaren geçen süreyi hesaplar. İlk otomatik yedek yoksa oluşturur; ay/gün numarası cron hatası kaldırıldı. Eski “03:00/yalnız son 5 yedek” arayüz metni kaldırıldı. Otomatik silme yoktur.
- Manifesti olmayan eski dosyalar silinmez; arayüzde doğrulanmamış ve restore devre dışı görünür. Bunların güvenli schema dönüşümü ayrı iştir. Ayrı disk/offsite, şifreleme, kapasite/retention, uyarı ve RPO/RTO operasyonları bu pakette kurulmadı.

## Yerel kurulum ve kullanıcı erişimi

Kullanıcı yetkisiyle `configure`, `db:migrate`, `admin:manage --mode create` çalıştırıldı. İlk ortam dosyası, yeni backend/database.sqlite ve admin@example.com (username admin) oluşturuldu. Rastgele parola `.local/admin-password.txt`, izin 0600; dizin 0700. Parola değerleri belgelenmez; `.local/`, ortam/DB/backup dosyaları Git dışındadır.

Yerel uygulama http://localhost:3000, API 5002. Tek geliştirme süreci yeniden başlatıldı; eski Vite modül yükleme hatası temiz başlangıçla giderildi. Tarayıcıda yeni admin girişi, reload sonrası cookie bootstrap ve manuel snapshot oluşturma doğrulandı; ilk otomatik snapshot da katalogda görüldü. Gerçek yerel DB üzerinde reset/restore/seed çalıştırılmadı. Tarayıcı kanıtı: `/Users/ozcelik/.codex/visualizations/2026/10/15/01a13e5c-eabf-70f1-bd97-3a490ffe1079/admin-backup-ready.jpg`.

## Doğrulama ve açık işler

Son `npm run check` başarılı: teknik adlandırma, strict typecheck, sıfır uyarılı lint, **43 backend + 14 frontend = 57 test**, iki production build; atlanan test yok. Gerçek tarayıcı smoke otomatik E2E değildir. GitHub CI/production deployment yapılmadı.

Regresyonlar: HTTP cookie/CSRF ve eski JWT reddi, replay/eşzamanlı refresh, logout/mutlak ömür, parola/rol/aktiflik iptali ve hash yarışı; admin kurtarma; gerçek HTTP transport üzerinden eşzamanlı/geç 401; geç refresh/hesap değişimi/çevrimdışı çıkış; WAL snapshot, bozuk kaynak, restore sonrası katalog/iptal, enjekte edilen son kontrol hatasında rollback; reset ortasında hata rollback'i ve admin koruması; geçen gün/ay sınırı/değişen aralık.

Mevcut kurulum geçişi: front/back birlikte güncellenmeli, explicit migration uygulanmalı, kullanıcı yeniden giriş yapmalıdır. Eski refresh JWT/JSON ve JWT_REFRESH_* ayarları kaldırıldı. Hiçbir eski gerçek DB otomatik dönüştürülmedi.

**A11 Preferences hatası çözülmedi.** Sonraki paket: ortak Preferences/API sözleşmesi, kullanıcı/tarih query kapsamı; ardından atomik planner çakışma/durum geçişleri, gerçek çalışma süresi/timezone ve tek timer motoru. Kalan audit ve bağımlılık işleri progress.md içindedir; bütün proje üretime hazır sayılmaz.
