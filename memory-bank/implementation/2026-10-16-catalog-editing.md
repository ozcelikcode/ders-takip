# A21 — Catalog editing and recovery UI

16 Ekim 2026. Öğrencinin kendi özel ders/konularını yönetme alt paketi tamamlandı. Diğer araçların tamamladığı A17/A18/A24 ve ortak planner yeniden uygulanmadı.

## Uygulanan davranış

- CoursesPage ve CourseDetailPage, özel ders sahibi veya admin için düzenleme/silme eylemlerini gösterir. Ortak/başka kullanıcıya ait katalog öğrenciye düzenleme açmaz. `lib/catalogAccess.ts` görünüm politikasını ortaklaştırır; sunucu son yetki sınırıdır. Kart bağlantısı ile işlem düğmeleri kardeştir, iç içe link/button yoktur.
- CourseEditorModal öğrenci create/edit ve admin create/edit için tek uygulamadır. Adminin yeni dersi varsayılan ortak açması korunur; aktif/ortak kontrolleri yalnız admin içindir. Eski CourseCreateModal ve admin içindeki ikinci CourseModal kaldırıldı.
- TopicEditorModal create/edit için tektir; eski CreateTopicModal kaldırıldı. Paylaşılan contracts Zod 4 şemaları doğrudan doğrulanır; bu formlardaki tekrarlı Zod 3 şeması/resolver kaldırıldı. Açıklama temizleme boş string ile açıkça gönderilir. İngilizce teknik adlar ve Türkçe kalıcı difficulty değerleri korunur.
- Düzenleme yalnız değişen alanları gönderir. Konu course/order/isActive değerleri form tarafından yeniden yazılmaz. Sadece formu açıp kaydetmek HTTP yazması üretmez. Arka plan refetch'i taslağı sıfırlamaz. Bilinmeyen mevcut simge ve aktif kategori listesinden çıkmış mevcut kategori korunur.
- CatalogEditorDialog: Headless UI odak/Escape sınırı, etiketli alanlar ve hatalar, pending sırasında fieldset/kapatma kilidi, açık sunucu hatası. `useCatalogMutation` çift gönderimi engeller; başarıdan sonra account catalog/sessions/topic-progress prefix'lerini yeniler. Önceki auth epoch'una ait yanıt başarı toast'ı/cache/close callback üretmez. Hata otomatik yazma retry'sı yapmaz ve taslak açık kalır.
- CatalogDeleteDialog dersin kalıcı silinmesi ile konunun arşivlenmesini ayrı anlatır. Ders ve konular/konu ilerlemeleri silinir; seanslar, notlar ve ölçülen interval geçmişi korunur, ilgili FK'ler temizlenir. Konu arşivlemesi kayıtları silmez. Async onay sunucu başarısını bekler, hata halinde açık kalır.
- CourseDetailPage arşivi yalnız yetkili kullanıcı istediğinde `isActive=false` sorgular. Arşiv görünümünde reorder ve ilerleme yazımı yoktur; düzenleme ve geri alma vardır. Restore sonrasında aktif katalog ve kullanıcı ilerlemesi yeniden okunur. İlerleme özeti aktif konuları sayar.
- AdminCoursesPage aynı editör/onay/ikon sistemini kullanır; önceki büyük inline modal ve tekrarlı ikon haritaları kaldırıldı. Ders listesi, detay, admin ders yönetimi ve katalog dialogları nötr panel/tipografi yönündedir. Renk yalnız küçük ders simgesinde kimlik belirtir. Drag handle'lara konu adı içeren erişilebilir ad eklendi.

## Geri alma bütünlüğü düzeltmesi

Arşivden geri alma, ad değişmeden de aktif ad çakışmasını transaction içinde denetler. Arşivlenen adın başka bir aktif konu tarafından yeniden kullanılması halinde 409 döner; hiçbir kısmi değişiklik olmaz. Arşiv kaydı benzersiz adla düzenlenip geri alınabilir. Eşzamanlı iki aynı adlı geri alma 200/409 ile sonuçlanır. Bu değişiklik schema/migration gerektirmez.

## Doğrulama

- `npm run check`: **8 contracts + 125 backend + 90 frontend = 223 test**, atlanan yok; ASCII naming, strict typecheck, sıfır uyarılı lint ve production build başarılı. Log: `/tmp/study-tracker-catalog-editor-check.log`.
- Yeni 2 backend regresyonu: restore ad çakışması/atomik geri dönüş, rename/restore sonrası ilerleme ve ölçüm geçmişi; concurrent restore. Yeni 15 editör testi: sahip/global/admin sınırı, shared validation, partial payload, bilinmeyen simge, kategori hata/retry ve mevcut kategori, draft/refetch, admin seçenekleri, no-op, pending/çift gönderim, eski hesap yanıtı ve farklı silme/arşiv politikaları. CourseDetailPage'e 1 arşiv/restore/cache regresyonu eklendi; mevcut reorder/progress testleri korunur.
- Son küçük drag-handle erişilebilir ad değişikliğinden sonra frontend strict, ilgili dosya lint'i, CourseDetailPage 5 davranış testi ve production build tekrar başarılı. Son build logu `/tmp/study-tracker-catalog-editor-final-build.log`.
- Production bundle, yalnız geçici SQLite ve sentetik hesaplarla localhost:3001/API 5003 üzerinde elle kontrol edildi: öğrenci özel ders adı/açıklaması, konu adı/süresi (30→50 dk), ortak dersin salt okunurluğu, arşiv onayı ve iptal, API ile arşivlenen tamamlanmış konunun UI'dan geri alınması, reload sonrası isim/süre/tamamlanma durumunun kalıcılığı, kalıcı ders silme onayındaki açık politika ve iptal; admin ortak ders oluşturma (aktif/global varsayılan) ve yeni listede görünmesi.
- Fixture SQLite doğrudan salt okunur kontrol edildi: konu aktif ve completed ilerlemesi korundu; seansın notları/duration/course/topic bağlantıları ve tek interval'deki **300 ölçülmüş saniye** değişmedi; FK kontrolü temiz. Kalıcı silme işlemi otomatik API/SQLite regresyonlarında doğrulandı; tarayıcıda son silme onayı verilmedi.
- Görsel kanıt repo dışında `catalog-editing-verified.png` ve `admin-catalog-verified.png` olarak Codex görselleştirme dizininde tutulur; sentetik veri içerir.

## Sınırlar ve sonraki işler

A21'in öğrenci katalog UI alt paketi kapandı. Kalan kategori/kullanıcı/ayar ve diğer modal/admin yüzeylerinin nötr tasarım tutarlılığı henüz topluca kapanmadı. Tam WCAG/mobil/touch ve otomatik E2E kanıtı yoktur. Metadata yazmaları mevcut last-writer-wins sözleşmesini korur; dirty patch kayıp alan yazımını azaltır ama optimistic version sözleşmesi değildir. Reorder mevcut tam snapshot/sürüm kuralını sürdürür. A19 DTO/Plan anlamı, A22 ve A04 açık kalır.

Geçici tarayıcı oturumlarından çıkıldı, sekme/API/preview durduruldu, temp SQLite dizini ve .local fixture script/pointer kaldırıldı. Tek gerçek dev localhost:3000/API 5002 üzerinde bırakıldı; gerçek admin parolası okunmadı/değiştirilmedi. Schema 006 ve mevcut özel backup/snapshot pointer dosyaları korunur. Commit/push/deployment yapılmadı.
