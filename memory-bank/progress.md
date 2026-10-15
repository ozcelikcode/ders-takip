# Ders Takip Sistemi — İlerleme

Son güncelleme: 15 Ekim 2026, oturum ve kurtarma paketi.

## Genel durum

İnceleme sonrası geliştirme başladı. Derleme ve kalite tabanı çalışır hale getirildi; kritik erişim/veri okuma sorunları kapatıldı. Bütün audit bulguları çözülmüş veya üretime hazır kabul edilmez.

Kurallar: `workingPrinciples.md`. Başlangıç incelemesi: `audits/2026-10-15-project-audit.md`. Uygulama kaydı: `implementation/2026-10-15-foundation.md`.

## Oturum ve kurtarma paketi

İptal edilebilir session/refresh rotasyonu, cookie/CSRF, frontend ortak refresh ve geç yanıt/çevrimdışı logout izolasyonu tamamlandı. Admin oluşturma/kurtarma CLI eklendi. Native SQLite snapshot/restore, manifest/checksum/şema kontrolü, güvenlik snapshot'ı/rollback ve transaction'lı reset uygulandı. Otomatik yedek aralığı her kontrolde okunur ve geçen tam güne göre işler.

Kullanıcı ilk kurulum istedi: yeni ortam/DB ve admin@example.com hesabı oluşturuldu; özel parola dosyası `.local/admin-password.txt` (0600, Git dışında). Gerçek yerel DB'de giriş/reload/manual backup doğrulandı; reset/restore/seed yapılmadı. Tek dev süreci localhost:3000/API 5002'de bırakıldı. Uygulama ve geçiş sınırları `implementation/2026-10-15-security-and-recovery.md` içindedir.

## Tasarım paketi

Güncel resmî Geist/Linear örnekleri incelendi; sade nötr ürün dili uygulandı. Ortak kabuk/kontroller ve ana kullanıcı ekranları yenilendi; eski pastel/cam/gradyan yönü geçersiz. Kalıcı kararlar, kapsam ve doğrulama `design-system.md` içinde.

Son aktivitelerin zaman sırası, dashboard konu verisi/sayıları, query response uyumu ve günlük özetin cache mutasyonu da düzeltildi. Gerçek çalışma süresi, admin istatistikleri ve Preferences hâlâ açık.

## Doğrulananlar

| Kontrol | Güncel durum |
|---|---|
| Temiz npm ci | Başarılı, kök lock ile |
| İngilizce/ASCII teknik adlandırma | Kural kaydedildi; otomatik ASCII kontrolü geçti, anlam incelemesi ayrı |
| Backend/frontend typecheck | Başarılı, strict korunuyor |
| Lint | ESLint 10 flat config, sıfır uyarı |
| Backend test | 43 test; HTTP/geçici SQLite, oturum/CLI ve WAL snapshot/restore/reset/hata rollback regresyonları |
| Frontend test | 14 test; auth/cache/çevrimdışı logout, gerçek HTTP transport ile eşzamanlı/geç 401, hata sınırı ve sıralama |
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
| A11 | Açık: Preferences sözleşmesi ve kalıcı senkron; sonraki paketin ilk işi. |
| A12 | Yerel check zinciri çalışıyor; 57 test ve CI workflow var. Uzak CI ve kapsamlı E2E henüz yok. |
| A13 | Uygulandı/testli: DB session, hash'li refresh rotasyonu/replay iptali, cookie/CSRF, logout/parola/rol iptali, ortak refresh ve geç yanıt izolasyonu. Production cookie dağıtımı ayrıca doğrulanmalı. |
| A14 | Kısmen: hesap cache temizliği ve geç yanıt izolasyonu tamam. Tarih/query key/invalidation ve kişisel yerel saklama tamamlanmadı. |
| A15–A16 | Açık: tek timer motoru ve timezone. |
| A18 | Kısmen: backup_interval 1/5/7 doğrulaması ve her koşumda uygulanması düzeltildi. Public/admin DTO, kayıt/bakım/sessionTimeout ayarlarının uygulanması açık. |
| A17 | Kısmen: dashboard includeTopics ve yanlış TYT/AYT sayımı düzeltildi; gerçek süre ve admin agregasyonları hâlâ açık. |
| A19 | Kısmen: MongoDB hata kalıntıları kaldırıldı, Sequelize 400/409 dönüşümü ve güvenli hata mesajları test edildi. Ortak doğrulama/DTO işi açık. |
| A20 | Lock, modern dev araçları, güvenli setup ve açık baseline migration var. Legacy şema evrimleri için sonraki explicit migration'lar gerekiyor. |
| A21 | Kısmen: yedi ölü modül/eski script/paket kaldırıldı; route splitting tamam. Planner/timer tekrarı ve kalan bağımlılık modernizasyonu açık. |
| A22 | Kısmen: ErrorBoundary, mobil Dialog odak/Escape, skip link, reduced-motion ve 390 px manuel kontrolü var. Tam klavye/touch takvim, WCAG, Lighthouse ve otomatik E2E tamamlanmadı. |

## Bağımlılıklar

Node 24.21.0, npm 11.19.0; Vite 8.3.4, plugin-react 6.1.2, ESLint 10.12.0, typescript-eslint 8.71.2, Vitest 5.0.4, sqlite3 6.0.1, tsx 4.23.15. TypeScript 5.9.3 sabit; React 18/Recharts 2/Router 6/Tailwind 3 dönüşümleri tamamlanmadı.

İlk mühendislik paketinde lock audit sonucu: 12 paket düğümü (0 critical / 5 high / 7 moderate). Başlangıçta bağımsız manifest çözümlemeleri kullanıldığından eski sayılarla doğrudan yüzde karşılaştırması yapılmaz. Aynı advisory birden fazla düğümü etkileyebilir. Bunlar açık iş olarak tutulur.

## Öncelik sırası

1. Preferences/API sözleşmesi; kullanıcı/tarih cache kapsamı.
2. StudySession çakışması/durum/gerçek süre/timezone.
3. Diğer çok adımlı silme/sıralama transaction bütünlüğü ve kurtarma operasyonları.
4. Timer/planner birleştirmesi, doğru özetler, ayarların uygulanması.
5. Kalan güvenlik/bağımlılık güncellemeleri ve E2E/mobil/erişilebilirlik.

Her iş ilgili davranış testi, gerekli kontroller ve memory-bank güncellemesiyle kapanır. İnceleme raporu tarihsel kalır; güncel durum bu dosyadan izlenir.
