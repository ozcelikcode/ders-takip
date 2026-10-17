# A22 — Header ve takvim erişilebilirliği

Header bildirim ve hesap menüleri Headless UI Popover.Group kullanır; ilk odak, Escape ile tetikleyiciye dönüş, birbirini kapatma ve dış hedefe odak davranışı testlidir. Manuel document dinleyicileri/ikinci popover yolu kaldırıldı. Arama tek form gönderimidir. Bildirim pending/error/retry/gerçek boş durumları ayrıldı; başarısız arka plan okumasında eski kayıt açıkça belirtilir, bilinmeyen okunmamış sayısı gösterilmez ve okundu yazması kapatılır. Liste son 5 tamamlanan seanstır; yerel okundu bilgisi hesaba özeldir. İşlem sonrası odak kalıcı kapatma düğmesine döner ve sonuç duyurulur. Geç hesap okuması epoch sınırında reddedilir.

Takvimde mevcut boş saat düğmeleri tek Tab durağı ve ok/Home/End/Ctrl+Home/End gezinmesine geçirildi; Enter/Space mevcut editörü açar. Seans işlemlerindeki etiketli saat/süre alanları sürükleme/boyutlandırmaya alternatif sunar ve mevcut sürümlü yazma motorunu kullanır. Yalnız değişen alanlar gönderilir; 409/read hatasında taslak korunur, kaynak yeniden okunmadan yazılmaz ve otomatik yazma tekrarı yapılmaz. Hücre değişince odak yeni seans düğmesine, görünür aralık dışındaysa Bugün düğmesine döner. Küçük kart komutları en az 24 px oldu; kısa komşu kart çakışmalarının tamamı çözülmedi.

npm run check: **18 contracts + 142 backend + 192 frontend = 352 test**, atlanan yok; naming/strict/lint/production build geçti. Son odak düzeltmesinden sonra frontend strict/root lint/192 test/build tekrar doğrulandı. Yeni 7 Header ve günlük/haftalık toplam 10 takvim regresyonu var. Ayrı production fixture ile bildirim okundu/ölçülen 5 dakika, popover/Escape/odak, günlük ok/Home/End/Enter ve saat/süre kaydı doğrulandı. Tarayıcıda bulunan hücre değişimi ref çakışması düzeltildi; odak yeni seans komutuna döndü. SQLite iki seansı, notu ve 300 saniyelik ölçümü korudu; integrity/FK temiz. Test oturumu kapatıldı, fixture süreç/sekme/DB/helper dosyaları kaldırıldı. Gerçek DB'ye test yazması/migration/seed/reset/restore yok; schema 006 korunur.

**A22 açık:** otomatik gerçek tarayıcı E2E, tam WCAG/ekran okuyucu, Lighthouse, gerçek dokunmatik cihaz kanıtı, DST fold ve kısa komşu kart yerleşimi. Bu paket A22'nin tamamını kapatmaz. A04 ve bağımlılık backlog'u sürer. Detay: implementation/2026-10-17-header-and-calendar-accessibility.md.

## Doğrulama ve kanıt sınırı

- `npm run check` bütün workspacelerde geçti; son hücre ref düzeltmesi sonrası frontend strict, kök lint, 192 frontend testi ve production build tekrar geçti.
- Yeni Header dosyası `frontend/tests/header-accessibility.test.tsx`; takvim regresyonları mevcut `PlannerCalendar.test.tsx` içinde korunur, kopya suite oluşturulmadı.
- Ayrı API 5003 ve production frontend 3001, rastgele JWT ve mkdtemp SQLite kullanıldı. Sentetik hesapla giriş/çıkış yapıldı. Günlük boş saatlerde Down dolu saati atladı, Home/End günün uçlarına gitti, Enter yeni seans editörünü açtı; Escape tetikleyiciye döndü. Yeni seans kaydı oluşturulmadı.
- Native alanlarla 09:00/60 → 10:15/90 → 09:30/75 → 10:15/90 değişimleri kaydedildi. Yeniden açılan form 10:15/90 gösterdi; son save ve Escape sonrası odak taşınan seansın işlem düğmesindeydi. Yerel İstanbul saati 10:15, DB UTC 07:15–08:45 olarak doğrulandı.
- SQLite yalnız iki seansı korudu; 702 planned/notu değişmedi, 701 completed ve 300 saniyelik interval korundu; integrity_check ok, foreign_key_check boş.
- Ekran kanıtları Codex artifact klasöründe: `notifications-accessibility-verified.png`, `calendar-accessibility-verified.png`. Bunlar sentetik veri içerir.
- Fixture SIGINT ile kapandı, temp directory yokluğu doğrulandı; yalnız bu paketin `.local/a22-fixture.*` yardımcıları kaldırıldı. Özel admin dosyası ve upgrade/snapshot pointer'ları okunmadı/değişmedi.
- Gerçek dokunmatik cihaz veya viewport emülasyonu bu turda yapılmadı. Native alan alternatifi sunulması tam touch/WCAG kanıtı değildir. DST tekrar saati ve çok kısa komşu kartların minimum yükseklik çakışması ayrıca ele alınmalı.
- Kaynak refetch sonrasında görünür sorgu aralığında bulunamıyorsa yazma kilitli kalır; kullanıcı kapatıp ilgili aralığa gitmelidir. Yeni detail endpoint/ikinci senkronizasyon yolu eklenmedi.
- Yeni bağımlılık, API veya migration eklenmedi. Önceki A19/A21 çalışma ağacı değişiklikleri korunur; commit/push/deploy yapılmadı.
