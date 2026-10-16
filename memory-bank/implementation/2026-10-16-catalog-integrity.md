# Katalog Bütünlüğü — 16 Ekim 2026

## Kapsam

Kullanıcı açık listeden devam edilmesini istedi. A10'un kalan ders/kategori/konu silme ve sıralama kapsamı uygulandı. Önceki reset safety backup/transaction davranışı ve gerçek süre/timezone çalışması korunur. Teknik adlar İngilizce, kullanıcı metinleri ve kalıcı difficulty değerleri Türkçe kalır. Bu paket şema veya bağımlılık değiştirmez.

## Tek yazma sınırı

services/catalog.ts bütün katalog create/update/delete/reorder HTTP yazmalarını SQLite IMMEDIATE transaction içinde yürütür. Sahiplik/global/admin kontrolü, ilişkili kategori/ders, ad/sıra kontrolü, yazma ve response okuması aynı transaction'dadır. Böylece kategori taşınırken yeni ders oluşturma, ders silinirken konu ekleme ve sıralama sırasında konu ekleme/arşivleme aynı yazma sınırında serileşir. Controller'larda ikinci iş kuralı uygulaması bırakılmadı. Kategori controller'ının iç DB hata mesajlarını response'a eklemesi kaldırıldı; merkezi güvenli hata çevirisi kullanılır.

- **Ders silme:** İlgili seansların courseId/topicId bağlantıları aynı transaction'da temizlenir; yalnız eşleşen bağlantılar değiştirilir. Seans save kancası optimistic updatedAt'i ilerletir. Sonra tek ders DELETE'i DB cascade ile aktif/pasif konuları siler. Seans, kullanıcı notu, durum, plan zamanı ve SessionInterval geçmişi korunur; açık ölçüm aralığı da kendiliğinden kapatılmaz. Eski seans snapshot'ıyla yazma 409 alır. Nullable FK'ler model tipinde de null kabul eder; kolon sözleşmesi değiştirilmedi.
- **Kategori silme:** Dolu kategoride hedef zorunludur (409); hedef kendisi olamaz (400), kaynak/hedef yoksa 404. Bütün kullanıcıların kişisel/global/aktif/pasif dersleri hedefe taşınır, ardından kategori silinir. Ders/konu/seans kimliği korunur. Hedefte aynı sahibin veya global görünür dersin ad çakışması 409'dur; başka sahiplerin özel aynı adlı dersleri geçerlidir. Hiçbir aşama kısmi commit yapmaz.
- **Konu silme:** Mevcut isActive=false arşiv sözleşmesi korunur; konu, seans ilişkisi ve ölçüm geçmişi silinmez. Yeniden etkinleştirmede aktif sıra çakışıyorsa, açık sıra istenmemişse sona alınır. Aktif sıralama arşiv satırlarını değiştirmez.
- **Oluşturma/güncelleme:** Ad çakışması ve otomatik konu sırası check+write içinde korunur. Yeni konu sırayı sunucuda hesaplar; eşzamanlı istekler aynı boş sırayı seçmez. Genel katalog metadata edit/delete yolları last-writer-wins davranışındadır; bütün kaynaklar için optimistic sürüm sözleşmesi iddia edilmez.

## Ortak sözleşme ve sıralama

contracts/catalog.ts ortak Zod şemaları ve API yazma tiplerini sağlar. Pozitif güvenli tam sayı ID/sıra, gerçek boolean, izinli alanlar, isim uzunluğu, renk ve mevcut 5–480 tam dakika/difficulty kuralı doğrulanır. Kategori/ders/konu path ID'leri de doğrulanır. Diğer liste query/response DTO dönüşümlerinin tamamı bu paketin kapsamında değildir.

Reorder yalnız dersin **bütün aktif konularının** tekil 1..N permütasyonunu kabul eder. topicOrders ile birlikte expectedTopics [{id,updatedAt}] zorunludur. Şekil/tekrar/sıra hatası 400; değişmiş/eksik/yabancı/pasif liste 409'dur. Topic updatedAt kancası önceki değerden en az 1 ms ilerler. Aynı snapshot'tan farklı iki eşzamanlı sıralamanın biri 409 alır; değişiklik yapmayan sıralama timestamp'i ilerletmez. Harici SQL/bulk yazıcı aynı kancaları uygulamıyorsa bu sürüm garantisine dahil değildir.

Ders detail/includeTopics response'u updatedAt taşır. Frontend yalnız tüm konular + artan sıra görünümünde sürüklemeyi açar; filtreli/azalan/alternatif sıralamada ve pending/refetch sırasında kapatır. Sunucu onayı öncesi sahte optimistic sıra gösterilmez, hata sonrasında liste yenilenir. Eski açık sekme expectedTopics taşımadığında 400 alır; frontend/backend birlikte güncellenmeli ve sekme yeniden yüklenmelidir.

Katalog transport'u başarı/409 sonrasında mevcut hesabın catalog ve session query prefix'lerini yeniler; böylece takvim/aktivite içindeki nested ders/kategori/konu verisi de güncellenir. Epoch kontrolü başka hesaba geçmiş yanıtın yenilemeyi tetiklemesini önler. 409 otomatik mutation retry üretmez.

CreateTopicModal'ın ders detail ile aynı key'e farklı response biçimi yazan gereksiz ikinci sorgusu kaldırıldı. Konu sayısından sıra tahmini kaldırıldı; sunucu sıralar. Form mevcut backend sınırıyla 5–480 tam dakikaya hizalandı. Ders silme onayı çalışma geçmişinin korunacağını açıklar.

## Doğrulama

npm run check başarılı: **8 contracts + 99 backend + 44 frontend = 151 test**, atlanan yok; strict typecheck, sıfır uyarılı lint, teknik adlandırma ve production build'ler başarılı. Log: /tmp/study-tracker-catalog-check.log. Bu pakette bağımlılık değişmedi; temiz npm ci önceki pakette doğrulanmıştı. Audit backlog'u 12 paket düğümü (5 high/7 moderate) açık kalır; yeniden security audit yapıldığı iddia edilmez.

Yeni 21 backend regresyonu gerçek HTTP/geçici SQLite kullanır: final course cascade ve ilk session detach sonrası SQL hatası/rollback; ilk ders taşıma ve kategori DELETE sonrası rollback; tüm sahip/aktiflik/global kapsamı; hedef kendisi/yok/dolu kategori; ad çakışması; karşılıklı kategori taşıma ve course create yarışı; tam/no-op/eski/yabancı/pasif/tekrarlı sıralama; eşzamanlı iki permütasyon; ilk topic UPDATE sonrası rollback; monoton sürüm; eşzamanlı create ad/sıra koruması; konu arşivi/reactivation; legacy çapraz FK ve açık interval'in korunması. Veri snapshot'ları işlem öncesi/sonrası karşılaştırıldı.

Yeni 5 frontend regresyonu: gerçek HTTP üzerinden katalog yazması sonrası katalog/seans cache yenileme ve başka hesabın cache'inin korunması; tam reorder snapshot/409/retry yok; component düzeyinde bekleyen işlemde ikinci drag reddi, filtre/azalan sırada kapatma, başarısız reorder'da onaylanmış sıra ve refetch. Önceki seans transport testleriyle aynı HTTP fixture'ı mutationTransport.test.ts altında toplandı.

Production bundle ayrı 127.0.0.1:3001 / 5003 ve atılabilir SQLite/admin hesabında açıldı. Klavyede Space → Down → Space ile ilk konu ikinci sıraya taşındı; DB ve reload sırası eşleşti. Yeni konu dördüncü sıraya eklendi; modal kapanışında detail cache'i bozulmadı. Aynı geçici DB'de servis üzerinden ders silindikten sonra DB'de course/topic sayısı sıfır, session/not/interval korunmuş; dashboard 0 ders / 0 konu / 1 tamamlanan seans / 5 dk ölçüm gösterdi. Browser'da kalıcı veri silme düğmesine basılmadı. Bu manuel smoke tam otomatik tarayıcı E2E veya yük testi değildir.

Görsel kanıtlar repo dışındaki aynı Codex artifact dizininde catalog-integrity.png ve catalog-history-preserved.png. Test hesabından çıkıldı; fixture sunucuları/DB/script'leri temizlendi. Gerçek DB'de migration/seed/reset/restore veya test amaçlı katalog yazması yapılmadı. Tek root npm run dev temiz contracts/Vite cache başlangıcıyla localhost:3000/API 5002'de bırakıldı; dev logu /tmp/study-tracker-catalog-dev.log. Önceki kullanıcı değişiklikleri korundu; commit/push/deployment yapılmadı.

## Açık sınırlar ve sonraki iş

A15 tek deadline motoru, reload/faz kalıcılığı ve çoklu sekme; A17 global admin agregasyonları; kalan A18 ayar uygulaması; bağımlılık/E2E/erişilebilirlik/kurtarma operasyonları açık. SQLite işlemleri mevcut tek backend koordinasyonu ve DB yazıcı kilidi kapsamındadır; harici yazıcı domain kurallarını atlayabilir. Katalog/istatistik yük testi yapılmadı.

Yeni A24: CourseDetailPage konu ilerlemesini topicStatuses useState içinde tutuyor; butonlar API'ye yazmaz ve reload durumları sıfırlar. Bu statik bulgu, kalıcı konu ilerlemesi özelliğinin çalıştığı şeklinde sunulamaz. Kullanıcıya ait ilerleme, global Topic.isActive/difficulty gibi katalog alanlarına yazılmamalı; kullanıcı-konu kapsamı ve ürün anlamı belirlenip ayrı persistence/migration ve reload/hesap ayrımı testleriyle ele alınmalı. Bu pakette mevcut veri modeli adına varsayımsal ilerleme tablosu eklenmedi.
