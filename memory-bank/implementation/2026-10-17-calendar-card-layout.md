# A22 — Short calendar card layout

Kısa seansların minimum tıklama yüksekliği, komşu kartları saat sınırları üzerinden örtebiliyordu. Ortak calendarGeometry artık gerçek piksel başlangıcı ve en az 28 px görsel yükseklik üzerinden bağlı çakışma grupları kurar; serbest sütunları yeniden kullanır ve eşit başlangıçta ID ile stabil sıralar. Kayıtların UTC başlangıç/bitiş/süre/durum/not değerleri değiştirilmez. İptal edilmiş ve diğer görünür kartlar aynı yerleşime katılır. Her etkileşim sütunu en az 160 px; boş haftalık günler 104 px kalır. Header ve saatler aynı kolon şablonunu kullanır, yoğun günlerde yatay kaydırma vardır. Gün sonunda 36 px boşluk son dakika kartını ve odak çerçevesini korur.

Kart başlığı/ikon hedefleri en az 24 px olarak 28 px kabuğa sığar; 68 px altı kompakt satırdır. Kısa kartta hedefi örten resize tutamacı kaldırıldı (36 px altı); mevcut Saat ve süreyi değiştir alternatifi korunur. Büyük kartlarda pointer resize devam eder. Takvim başlangıcında saniye/milisaniye korunur; hiçbir kaydın zamanı kaydırılmaz. Günlük/haftalık aynı motoru kullanır; DOM sırası görünür başlangıç/ID sırasıdır.

Doğrulama: **18 contracts + 142 backend + 200 frontend = 360 test**, atlanan yok; npm run check naming/strict/lint/production build geçti. Son görsel boşluk/sıra düzenlemesinden sonra frontend strict, kök lint, 200 test ve production build tekrar geçti. Yeni 4 geometry ve günlük/haftalık toplam 4 component regresyonu var. Ayrı temp production fixture'da 1 dakikalık komşu kartlar/iptal kaydı, klavye menüsü/Escape/odak ve 23:59 hedefi kontrol edildi. Beş seansın bütün kolonları eski snapshot ile aynı; interval üretilmedi, integrity/FK temiz. Gerçek kullanıcı DB'si/şema/bağımlılıklar değişmedi. Fixture sekme/süreç/temp veri temizlendi; root dev 3000/API 5002 korunur.

A22 bütünüyle kapanmadı: gerçek dokunmatik cihaz, DST fold, tam WCAG/ekran okuyucu, Lighthouse ve otomatik gerçek tarayıcı E2E açık. A04/bağımlılık backlog'u sürer. Ayrıntı: implementation/2026-10-17-calendar-card-layout.md.

## Kanıt ve sınırlar

- İlk tam check: `/tmp/study-tracker-a22-layout-check.log`; son frontend test/build: `/tmp/study-tracker-a22-layout-final-tests.log`, `/tmp/study-tracker-a22-layout-final-build.log`.
- Fixture yalnız mkdtemp SQLite, API 5003 ve production frontend 3001 kullanır. Bir dakikalık 09:59/10:00 komşular, 10:00 cancelled, 23:59 ve normal 60 dakika kaydı vardır. İlk üç kayıt günlük görünümde ayrı sütunlarda görüldü. Kısa ve son dakika menüsü Return ile açıldı; Escape doğru işlem düğmesine döndü. Kalıcı yazma/silme/start uygulanmadı.
- Fixture beş seansının her kolonu önceki JSON snapshot ile zaman biçimleri normalize edilerek karşılaştırıldı: başlangıç/bitiş/duration/status/notes/kimlik/sürüm dahil aynı. session_intervals boş; integrity_check ok, foreign_key_check boş.
- Kod değişikliğinde dist tekrar üretildiği sırada açık eski bundle chunk isteği ErrorBoundary'ye düştü; derleme tamamlanınca yeniden yükleme ile düzeldi. Bu, daha önce belgelenmiş deployment asset/cache konusudur; çözülmüş sayılmadı.
- `short-calendar-cards-verified.png` ve `calendar-day-end-focus-verified.png` Codex artifact klasöründe sentetik veriyle görsel kanıttır. Gerçek dokunmatik/emülasyon/ekran okuyucu/WCAG/Lighthouse veya otomatik tarayıcı E2E iddiası yoktur.
- Tekrarlanan DST saatinin ayrı satırları ve fold boyunca görünüm hâlâ açıktır; bu saf görsel çakışma düzeni DST zaman sözleşmesini değiştirmez. Çok büyük veri yük/kapasite ölçümü yapılmadı.
- Önceki A19/A21/A22 çalışma ağacı korunur. Yeni API/migration/dependency yok; gerçek DB/test yazması/reset/restore/seed/parola okuma yok. Commit/push/deployment yapılmadı.

Kapanış: test hesabından çıkış login ekranında doğrulandı; sekme kapandı, fixture SIGINT ile durdu, temp dizin yokluğu doğrulandı ve yalnız bu paketin helper/pointer dosyaları kaldırıldı. Son frontend strict/kök lint/200 test/build geçti. Gerçek dev frontend 3000 ve API 5002 sağlık kontrolü başarılı; port başına tek dinleyici var.
