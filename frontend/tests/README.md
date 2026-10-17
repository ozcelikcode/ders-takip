# Frontend behavior tests

Bu klasör, ekranları gerçek React/Headless UI ve TanStack Query bileşenleriyle çalıştıran akış regresyonları içindir. `src/**/*.test.*` yanındaki mevcut birim/bileşen testleri de çalışmaya devam eder; aynı senaryo iki yerde kopyalanmaz.

```bash
npm run test --workspace frontend -- tests/category-management.test.tsx tests/user-management.test.tsx tests/admin-settings.test.tsx
npm run typecheck --workspace frontend
npm run check
```

Vitest hem `src/` hem `tests/` dosyalarını keşfeder. `tests/` strict TypeScript ve ESLint kapsamındadır. Bir testin çalışması, typecheck veya lint yerine geçmez.

`category-management.test.tsx` yetki, hata/boş ayrımı, ortak sözleşme doğrulaması, kısmi güncelleme, taslak/refetch, nested dialog odak/Escape, bekleyen işlem kilidi, kategori taşıma hedefi/hata/retry ve geç hesap yanıtını doğrular. API bu testte kontrollü taklittir; başarılı response dönmesi gerçek SQL veya tarayıcı E2E kanıtı sayılmaz.

Gerçek HTTP/SQLite yetki, atomiklik, rollback ve geçmiş koruma regresyonları `backend/tests/catalog.test.cjs` içindedir; yalnız `mkdtemp` altında oluşturulan veritabanlarında çalışır. Canlı `.env`, kullanıcı veritabanı veya yedekleri test fixture'ı olarak kullanılmaz. Manuel tarayıcı kontrolü gerekiyorsa ayrı portlar ve atılabilir veriyle yapılır, ardından süreçler ve veriler temizlenir.

`user-management.test.tsx` sunucu toplamı/sayfalama/tüm kayıtlarda arama, hata/retry, öz-hesap koruması, async rol/durum/silme onayı, son sayfa düzeltmesi, create sözleşmesi ve kimlik bilgisi yaşam döngüsü, pending/duplicate/epoch/unmount sınırlarını doğrular. Gerçek HTTP/SQLite pagination, arama ve admin create doğrulaması `backend/tests/user-management.test.cjs`; paylaşılan kurallar `packages/contracts/tests/users.test.cjs` içindedir. Yalnız atılabilir veriler kullanılır.

`admin-settings.test.tsx` gerçek settingsStore ile 18 ekran regresyonudur: pristine/dirty refetch, partial/no-op save, hidden-section doğrulama, read/write hata/retry, verified/unknown backup kilidi, async restore/reset ve hesap/unmount sınırı. API kontrollü taklittir; gerçek snapshot/checksum/rollback/reset kapsamı `backend/tests/backups.test.cjs` temp SQLite testlerindedir. Private read/write yarışları `src/store/settingsStore.test.ts` içinde ayrıca doğrulanır.


`admin-overview.test.tsx` 8 regresyonla admin sınırı, global/ölçülen özet, beş durum/tür ve bağımsız pending/error/retry/empty durumlarını doğrular. `session-surfaces.test.tsx` 16 regresyonla TodaysPlans ve CreateSessionModal async sunucu onayı, çift gönderim/epoch/unmount sınırı, 409 sonrası taslak/sürüm/read retry, nested Escape/odak ve pasif ders/tarihsel başlık/açıklama temizlemeyi doğrular. API kontrollü taklittir; gerçek HTTP/SQLite veya tarayıcı E2E yerine geçmez.


A19: `auth-forms.test.tsx` ortak kayıt/giriş kurallarını gerçek RHF formlarında; `contract-transport.test.ts` gerçek geçici HTTP ile bozuk yanıt reddi, DTO/ID projeksiyonu ve geç parola yanıtı hesap sınırını doğrular. `session-surfaces.test.tsx` 1/1.5/1440 dakika kabulü ve 0/1441 reddini de kapsar. Bunlar tarayıcı E2E değildir. Plan tarih/çakışma/yetki/detach/geçmiş/SQL rollback ve auth/backup request sınırları `backend/tests/plans.test.cjs` ve `request-contracts.test.cjs` içindeki mkdtemp SQLite testlerindedir; gerçek kullanıcı DB'si kullanılmaz.

A22: `header-accessibility.test.tsx` 7 regresyonla pending/error/retry/empty, bozuk payload, stale refetch, son 5 kayıt/hesaba özel okundu, kaybolan eylem odağı, Popover Escape/karşılıklı kapanma/dış hedef ve geç epoch okumasını doğrular. `src/components/planner/PlannerCalendar.test.tsx` ilk A22 paketinde günlük/haftalık toplam 22 test içeriyordu; yeni 10 regresyon tek Tab/ok/Home/End, saat/süre, 409 sonrası dirty taslak ve latest version retry, geçersiz süre/iptal ve kaynak read retry sınırlarını kapsar. Hücre değişiminden sonra seans odağı da kontrol edilir. Gerçek React/Headless UI kullanılır; API kontrollü taklittir. Manuel production fixture kanıtı implementation belgesindedir; otomatik tarayıcı E2E, gerçek dokunmatik cihaz, tam WCAG ve Lighthouse tamamlanmış sayılmaz.

A22 kısa kart paketi: mevcut `calendarGeometry.test.ts` içine 4 regresyon (iki ölçek/saat sınırı, serbest lane/stabil sıra/immutable kaynak, sub-minute konum); `PlannerCalendar.test.tsx` içine günlük/haftalık toplam 4 regresyon (komşu/iptal kart menüleri ve kaynak koruma, 23:59 gutter) eklendi. Güncel takvim component dosyası 26 testtir; toplam frontend 200 test. jsdom gerçek piksel hit testing yapmaz; gerçek production görünüm manuel temp fixture ile ayrıca doğrulandı. Tam WCAG/touch/otomatik browser E2E yerine geçmez.
