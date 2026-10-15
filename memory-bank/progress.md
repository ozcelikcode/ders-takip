# Ders Takip Sistemi — İlerleme

Son güncelleme: 15 Ekim 2026, tasarım sistemi paketi.

## Genel durum

İnceleme sonrası geliştirme başladı. Derleme ve kalite tabanı çalışır hale getirildi; kritik erişim/veri okuma sorunları kapatıldı. Bütün audit bulguları çözülmüş veya üretime hazır kabul edilmez.

Kurallar: `workingPrinciples.md`. Başlangıç incelemesi: `audits/2026-10-15-project-audit.md`. Uygulama kaydı: `implementation/2026-10-15-foundation.md`.

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
| Backend test | 22 test; gerçek HTTP + geçici SQLite ve yapılandırma/hata katmanı |
| Frontend test | 8 test; hata sınırı, hesap cache izolasyonu ve son seans sıralaması |
| Backend/frontend production build | Başarılı, Vite 8 |
| Production bundle tarayıcı smoke | Dolu geçici veride giriş/dashboard/dersler, planner/özet, arama, mobil özel seans oluşturma; açık/koyu görünüm |
| GitHub CI | Workflow eklendi; uzak koşum yapılmadı |
| Kullanıcı DB'sinde işlem | Yapılmadı |
| Mobil manuel kontrol | 390×844; günlük görünüm, menü, Escape/odak, arama ve form; yatay sayfa taşması yok |
| Otomatik tarayıcı E2E / tam WCAG / Lighthouse / yük | Henüz yok |

## Audit durumları

| Bulgu | Durum / kanıt sınırı |
|---|---|
| A01 | Ders/konu/kullanıcı okuma kapsamı düzeltildi; owner/other/admin HTTP matrisi var. |
| A02 | Sabit secret fallback kaldırıldı; env doğrulama ve güvenli development seed eklendi. Gerçek dağıtım anahtarı/oturum yenilemesi yapılmadı. |
| A03 | Tek DB yolu uygulandı; snapshot'ın aynı geçici DB'deki kayıtları içerdiği doğrulandı. |
| A04 | Açık. Snapshot/restore atomikliği, hata kurtarma ve gerçek aralık planı tamamlanmadı; timezone/noOverlap eklendi. |
| A05 | GET durum/not değiştirmiyor; tekrar okuma regresyonu var. Zaman aşımı ürün politikası ayrı iş. |
| A06 | Yeni oturumların ders/konu yetkisi, eşleşmesi ve aktifliği doğrulanıyor. Tarihsel hatalı ilişkiler gerçek DB'de taranmadı. |
| A07–A11 | Açık: atomik çakışma, durum makinesi, gerçek süre, transaction'lı silme/reset, Preferences. |
| A12 | Yerel check zinciri çalışıyor; 30 test ve CI workflow var. Uzak CI ve kapsamlı E2E henüz yok. |
| A13 | Açık: sunucuda refresh iptali, logout ve parola değişimi sonrası oturum iptali eksik. |
| A14 | Kısmen: hesap cache temizliği ve geç yanıt izolasyonu tamam. Tarih/query key/invalidation ve kişisel yerel saklama tamamlanmadı. |
| A15–A16, A18 | Açık: tek timer, timezone ve gerçek ayar uygulaması. |
| A17 | Kısmen: dashboard includeTopics ve yanlış TYT/AYT sayımı düzeltildi; gerçek süre ve admin agregasyonları hâlâ açık. |
| A19 | Kısmen: MongoDB hata kalıntıları kaldırıldı, Sequelize 400/409 dönüşümü ve güvenli hata mesajları test edildi. Ortak doğrulama/DTO işi açık. |
| A20 | Lock, modern dev araçları, güvenli setup ve açık baseline migration var. Legacy şema evrimleri için sonraki explicit migration'lar gerekiyor. |
| A21 | Kısmen: yedi ölü modül/eski script/paket kaldırıldı; route splitting tamam. Planner/timer tekrarı ve kalan bağımlılık modernizasyonu açık. |
| A22 | Kısmen: ErrorBoundary, mobil Dialog odak/Escape, skip link, reduced-motion ve 390 px manuel kontrolü var. Tam klavye/touch takvim, WCAG, Lighthouse ve otomatik E2E tamamlanmadı. |

## Bağımlılıklar

Node 24.21.0, npm 11.19.0; Vite 8.3.4, plugin-react 6.1.2, ESLint 10.12.0, typescript-eslint 8.71.2, Vitest 5.0.4, sqlite3 6.0.1, tsx 4.23.15. TypeScript 5.9.3 sabit; React 18/Recharts 2/Router 6/Tailwind 3 dönüşümleri tamamlanmadı.

İlk mühendislik paketinde lock audit sonucu: 12 paket düğümü (0 critical / 5 high / 7 moderate). Başlangıçta bağımsız manifest çözümlemeleri kullanıldığından eski sayılarla doğrudan yüzde karşılaştırması yapılmaz. Aynı advisory birden fazla düğümü etkileyebilir. Bunlar açık iş olarak tutulur.

## Öncelik sırası

1. Auth yaşam döngüsü ve güvenilir backup/restore/reset.
2. Oturum çakışması/durum/gerçek süre/timezone.
3. Preferences ve diğer API sözleşmeleri; kullanıcı/tarih cache kapsamı.
4. Timer/planner birleştirmesi, doğru özetler, ayarların uygulanması.
5. Kalan güvenlik/bağımlılık güncellemeleri ve E2E/mobil/erişilebilirlik.

Her iş ilgili davranış testi, gerekli kontroller ve memory-bank güncellemesiyle kapanır. İnceleme raporu tarihsel kalır; güncel durum bu dosyadan izlenir.
