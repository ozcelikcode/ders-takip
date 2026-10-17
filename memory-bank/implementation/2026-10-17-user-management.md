# A21 — User management (17 Ekim 2026)

## Kapsam ve davranış

AdminUsersPage ve CreateUserModal nötr tasarım sistemine taşındı. Kullanıcı listesi artık ilk 100 kaydı toplam kabul etmez: 20 kayıt/sayfa, sunucunun toplam/sayfa verisi ve bütün kayıtları tarayan sunucu araması kullanılır. Arama gönderilince ilk sayfaya dönülür; temizleme desteklenir. Son satır silinince geçersiz sayfa düzeltilir. Aynı sıralama değerinde backend ID ikincil sıralaması sayfalar arasında tekrar/atlamayı engeller; eşzamanlı ekleme/silme sırasında offset pagination snapshot garantisi değildir.

Okuma hatası gerçek boş listeden ayrılır ve tekrar okuma sunulur. Kullanıcı özeti toplu includeStats verisini ve measured studySeconds değerini gösterir. Tarihler görüntüleyen kullanıcının IANA timezone tercihine göre biçimlenir. API istatistik vermediyse uydurma sıfır yerine “—” gösterilir.

Rol/durum/silme onayları veri etkisini ve oturum iptalini açıklar; sunucu başarısını bekler, hata durumunda açık kalır. Çift gönderim ve beklerken kapama engellenir. Kendi hesabında rol/durum/silme engeli hem UI hem mevcut sunucu sınırında korunur. Yönetici kontrolü UI'da okuma/form açılmasından önce, sunucuda mevcut authorize middleware'inde uygulanır.

Yeni ortak EditorDialog katalog ve kullanıcı oluşturma formlarının tek dialog motorudur; eski CatalogEditorDialog dosyası kaldırıldı. useAccountMutation busy ref, mount/epoch kontrolü, inline hata ve sunucu onayından sonra hesap kapsamlı invalidation sağlar. useCatalogMutation bu hook'un katalog/seans/ilerleme adaptörüdür. Kullanıcı işlemleri kullanıcının bütün kaynak prefix'ini yeniler; başka hesabın cache'ine dokunmaz. Hesap değişimi sunucuya gönderilmiş isteği geri almaz; geciken yanıt eski hesabın başarı mesajını/yenilemesini tetiklemez.

## Sözleşme

createManagedUserSchema ortak contracts Zod 4 şemasıdır; frontend ve admin POST /users aynı kuralları kullanır. İngilizce alfanümerik 3–20 kullanıcı adı, trim edilmiş 2–50 ad/soyad, geçerli e-posta, en az 12 karakter ve en fazla 72 UTF-8 baytı parola, gerçek boolean ve student/admin rolü uygulanır. Parola trim edilmez; bcrypt kesilmesi reddedilir. Varsayılan aktif öğrenci hesabıdır. Bilinmeyen alanlar reddedilir; parola tekrarı yalnız form kontrolüdür ve API'ye gönderilmez. Form iptal/başarıdan sonra unmount olur, tekrar açılınca eski kimlik bilgisi taşınmaz; hata girdiyi korur. Parola depolama/log/cache'e eklenmedi.

Liste/oluşturma/rol-durum patch tipleri frontend transport sınırında paylaşılır. Bu çalışma bütün yanıtları runtime DTO şemasıyla doğrulamaz. Public auth register, kalan kullanıcı update/controller doğrulamaları, plan ve backup sözleşmeleri A19'da açıktır. Persisted veri kontratı, rol değerleri ve schema 006 değişmedi; migration gerekmedi.

## Regresyonlar

- frontend/tests/user-management.test.tsx: 13 gerçek React/Headless UI/Query ekran testi. Server pagination/search, okuma hatası/retry, öz-koruma, sunucu onayı/pending/çift gönderim, hata açık kalma/tekrar deneme, hesap cache ayrımı, son sayfa düzeltme, ortak create doğrulaması/confirmation dışlama, hata sonrası taslak ve yeniden açılma, geç epoch/unmount yanıtı. Devre dışı üst fieldset testi native :disabled semantiğini kontrol eder.
- backend/tests/user-management.test.cjs: 5 HTTP/SQLite testi. 102 kullanıcı/6 sayfa/stabil sıralama, 102. kaydı bulan bütün katalog araması, hash/default/normalizasyon, geçersiz/unknown alan reddi, admin sınırı ve kendi hesabını koruma. Yalnız mkdtemp SQLite.
- packages/contracts/tests/users.test.cjs: 2 test. Varsayılan/trim/strict sözleşme ve ASCII kullanıcı adı/UTF-8 parola/rol/boolean sınırları.
- Önceki katalog ve kategori testleri aynı ortak dialog/hook ile çalışır; ikinci implementasyon veya toplu test taşıması yoktur.

## Tamamlanan doğrulama ve yerel ortam

npm run check başarılı: 10 contracts + 130 backend + 116 frontend = 256 test, 0 skipped; adlandırma/strict TypeScript/sıfır uyarılı ESLint/production build geçti. Log: /tmp/study-tracker-user-management-check.log. Son test fixture iyileştirmesi aranan kullanıcının ilk 100 dışında, 102. sırada olduğunu açıkça doğrular; ilgili 5 backend testi tekrar geçti (/tmp/study-tracker-user-management-final-backend.log). Son route biçimlendirmesi ve belge güncellemesinden sonra lint ve git diff --check de temiz. Derlenmiş frontend 3001 ve ayrı temp SQLite API 5003 ile 102 kullanıcı/6 sayfa, ikinci sayfa, server search, silme onayı/iptal, form etiketleri/varsayılanları ve Escape/odak dönüşü doğrulandı. Yeni parola/rol grant/kalıcı silme browser final işlemleri uygulanmadı; create ve işlem ack/failure/pending otomatik regresyonlarda testlidir. Ekran kanıtı: /Users/ozcelik/.codex/visualizations/2026/10/15/01a13e5c-eabf-70f1-bd97-3a490ffe1079/user-management-verified.png.

Fixture oturumundan çıkıldı; sekme/süreç/temp DB kaldırıldı. Aynı projeye ait iki dev ağacı port çakıştırıyordu; yalnız bu ağaçlar kapatılıp tek root npm run dev açıldı. localhost:3000 ve API 5002 sağlıklı; log /tmp/study-tracker-user-management-dev.log. Gerçek DB testi/migration/seed/reset/restore yapılmadı; schema 006 korunur. Önceki yerel değişiklikler korundu; commit/push/deployment yok.

## Kalan paket

A21'de sıradaki AdminSettingsPage ve backup ekranıdır: taslağın refetch ile sıfırlanması, yalnız değişen ayarların kaydı, backup GET hatası/boş ayrımı, restore/reset için görünür async onay/busy/error/epoch, verified === true kontrolü. Admin dashboard ve diğer kalan yüzeylerde nötr tasarım incelemesi de devam eder. A19/A22/A04 bu paketle kapanmaz.
