# Ders Takip Sistemi — İlerleme

Son güncelleme: 16 Ekim 2026, tercihler/hesap sınırları/site kimliği paketi.

## Genel durum

İnceleme sonrası geliştirme başladı. Derleme ve kalite tabanı çalışır hale getirildi; kritik erişim/veri okuma sorunları kapatıldı. Bütün audit bulguları çözülmüş veya üretime hazır kabul edilmez.

Kurallar: `workingPrinciples.md`. Başlangıç incelemesi: `audits/2026-10-15-project-audit.md`. Uygulama kaydı: `implementation/2026-10-15-foundation.md`.

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
| Ortak sözleşme test | 3 test; Preferences ve public/strict ayar şemaları |
| Backend test | 52 test; HTTP/geçici SQLite, oturum/CLI, migration/tercih/ayar transaction ve WAL snapshot/restore/reset regresyonları |
| Frontend test | 31 test; auth/cache/çevrimdışı logout, tercih/kayıt/kullanıcı/tarih/bildirim/branding, gerçek HTTP refresh, hata sınırı ve sıralama |
| Backend/frontend production build | Başarılı, Vite 8 |
| Production bundle tarayıcı smoke | Dolu geçici veride giriş/dashboard/dersler, planner/özet, arama, mobil özel seans oluşturma; açık/koyu görünüm |
| GitHub CI | Workflow eklendi; uzak koşum yapılmadı |
| Yerel ilk kurulum | Açık kullanıcı yetkisiyle configure/migration/admin oluşturma; giriş/reload/manual snapshot başarılı; reset/restore/seed yok |
| Mobil manuel kontrol | 390×844; günlük görünüm, menü, Escape/odak, arama ve form; yatay sayfa taşması yok |
| Otomatik tarayıcı E2E / tam WCAG / Lighthouse / yük | Henüz yok |

## Audit durumları

| Bulgu | Durum / kanıt sınırı |
|---|---|
| A01 | Ders/konu/kullanıcı okuma kapsamı düzeltildi; owner/other/admin HTTP matrisi var. |
| A02 | Sabit secret fallback kaldırıldı; env doğrulama ve güvenli development seed eklendi. Gerçek dağıtım anahtarı/oturum yenilemesi yapılmadı. |
| A03 | Tek DB yolu uygulandı; snapshot'ın aynı geçici DB'deki kayıtları içerdiği doğrulandı. |
| A04 | Tek süreç kapsamında native WAL snapshot/atomik restore, manifest/checksum/şema kontrolü, safety/rollback, bakım kapısı ve geçen gün planı testli. Offsite/kapasite/retention ve gerçek ortam kurtarma tatbikatı açık. |
| A05 | GET durum/not değiştirmiyor; tekrar okuma regresyonu var. Zaman aşımı ürün politikası ayrı iş. |
| A06 | Yeni oturumların ders/konu yetkisi, eşleşmesi ve aktifliği doğrulanıyor. Tarihsel hatalı ilişkiler gerçek DB'de taranmadı. |
| A07–A09 | Açık: atomik çakışma, ortak durum makinesi ve gerçek çalışma süresi. |
| A10 | Kısmen: settings_only ve all reset safety backup + transaction + rollback testli; diğer ders/kategori/konu silme/sıralama işlemleri açık. |
| A11 | Uygulandı/testli: ortak v1 sözleşme, explicit legacy JSON migration/arşiv, tam round-trip, sıralı ve sunucu onaylı kayıt, hata ve hesap sınırı. Dil/bildirim/süre tercihi saklamak ilgili ürün altyapısının tamamlandığı anlamına gelmez. |
| A12 | Yerel check zinciri çalışıyor; 86 test ve CI workflow var. Uzak CI ve kapsamlı E2E henüz yok. |
| A13 | Uygulandı/testli: DB session, hash'li refresh rotasyonu/replay iptali, cookie/CSRF, logout/parola/rol iptali, ortak refresh ve geç yanıt izolasyonu. Production cookie dağıtımı ayrıca doğrulanmalı. |
| A14 | Tanımlı kapsam uygulandı/testli: ortak account/resource/date/timezone key factory, ilgili özetlere invalidation, gün anahtarı yenileme, memory-only tercihler, hesaplı bildirim geçmişi, profil/admin geç yanıt sınırı. Backend timezone doğruluğu A16 altında açık. |
| A15–A16 | Açık: tek timer motoru ve timezone. |
| A18 | Kısmen: backup_interval 1/5/7 doğrulaması ve her koşumda uygulanması düzeltildi. Public/admin DTO, izinli tipler ve atomik ayar yazma da tamamlandı. Kayıt/bakım/sessionTimeout ve diğer global ayarların sunucuda uygulanması açık. |
| A17 | Kısmen: dashboard includeTopics ve yanlış TYT/AYT sayımı düzeltildi; gerçek süre ve admin agregasyonları hâlâ açık. |
| A19 | Kısmen: MongoDB hata kalıntıları kaldırıldı, Sequelize 400/409 dönüşümü ve güvenli hata mesajları test edildi. Ortak doğrulama/DTO işi açık. |
| A20 | Lock, modern dev araçları, güvenli setup, üç workspace ve açık 001/002/003 migration var. Legacy şema evrimleri için sonraki explicit migration'lar gerekiyor. |
| A21 | Kısmen: yedi ölü modül/eski script/paket kaldırıldı; route splitting tamam. Planner/timer tekrarı ve kalan bağımlılık modernizasyonu açık. |
| A22 | Kısmen: ErrorBoundary, mobil Dialog odak/Escape, skip link, reduced-motion ve 390 px manuel kontrolü var. Tam klavye/touch takvim, WCAG, Lighthouse ve otomatik E2E tamamlanmadı. |
| A23 | Yeni kullanıcı gereksinimi uygulandı: bütün görünen site adı/admin kimlik ayarları ortak kaynaktan değişir; repo/domain değiştirmez. |

## Bağımlılıklar

Ortak contracts workspace Zod 4 kullanır; diğer frontend formları Zod 3/RHF üzerinde kalır. Kök dev/build/check sözleşmeleri derler; Vite linked workspace için ayrı major bağımlılığını optimize eder.

Node 24.21.0, npm 11.19.0; Vite 8.3.4, plugin-react 6.1.2, ESLint 10.12.0, typescript-eslint 8.71.2, Vitest 5.0.4, sqlite3 6.0.1, tsx 4.23.15. TypeScript 5.9.3 sabit; React 18/Recharts 2/Router 6/Tailwind 3 dönüşümleri tamamlanmadı.

İlk mühendislik paketinde lock audit sonucu: 12 paket düğümü (0 critical / 5 high / 7 moderate). Başlangıçta bağımsız manifest çözümlemeleri kullanıldığından eski sayılarla doğrudan yüzde karşılaştırması yapılmaz. Aynı advisory birden fazla düğümü etkileyebilir. Bunlar açık iş olarak tutulur.

## Öncelik sırası

1. Atomik StudySession çakışma/durum geçişleri.
2. Gerçek çalışma süresi, pause/resume ve timezone aralıkları.
3. Diğer çok adımlı silme/sıralama transaction bütünlüğü ve kurtarma operasyonları.
4. Timer/planner birleştirmesi, doğru özetler, ayarların uygulanması.
5. Kalan güvenlik/bağımlılık güncellemeleri ve E2E/mobil/erişilebilirlik.

Her iş ilgili davranış testi, gerekli kontroller ve memory-bank güncellemesiyle kapanır. İnceleme raporu tarihsel kalır; güncel durum bu dosyadan izlenir.
