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
