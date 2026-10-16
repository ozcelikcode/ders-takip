# Seans Bütünlüğü — 16 Ekim 2026

## Kapsam

Kullanıcı açık iş listesinden devam edilmesini istedi. A07/A08: atomik create/move/resize, ortak durum politikası ve eski istemci yazmalarının algılanması uygulandı. Planlanan/gerçek süre ayrımı (A09), timezone (A16) ve tek Pomodoro motoru (A15) bu paketin tamamlanma iddiasına dahil değildir.

## Yazma sınırı

StudySession HTTP yazmaları services/studySessions.ts içinde birleşir. Her create/update/action/delete SQLite IMMEDIATE transaction içindedir. Sahiplik, güncel kayıt, ilişki erişimi, çakışma, durum ve tek aktif seans kontrolleri aynı transaction'dan okunur; response snapshot'ı da commit öncesi bu işlemden türetilir. Kontrol ile yazma arasına başka bir API yazması giremez. SQLite'ın tek yazıcı/IMMEDIATE davranışı [resmî transaction belgesiyle](https://www.sqlite.org/lang_transaction.html) doğrulandı. Doğrudan SQL/harici yazıcı bu servis kurallarını uygulamıyorsa aynı alan politikası garanti edilmez; DB trigger eklenmedi.

Aralıklar [startTime,endTime) biçimindedir. Bitişe eşit başlangıç kabul edilir; kısmi, içerilen, kapsayan veya eşit örtüşme 409'dur. planned/in_progress/paused/completed aralığı rezerve eder; cancelled boşaltır. Create, move/resize ve cancelled → planned yeniden etkinleştirme aynı kontrolü kullanır. Güncelleme kendi id'sini dışlar. Tarihsel çakışmalar topluca değiştirilmez; metadata/tamamlama bu kayıtları sessizce onarmaz.

Başlangıç/bitiş açık offset veya Z içeren ISO instant olmalıdır; süre 1 dakika–24 saat aralığında doğrulanır. duration sunucuda türetilir; istemci duration/completedAt/userId gibi alanları yazamaz. Form/API tipi ortak contracts kaynağındadır. Güncellemede seçilen plan/ders/konu da owner/global/admin erişimi, aktiflik ve konu-ders eşleşmesiyle denetlenir. İlişki temizleme/null sözleşmesi bu pakette eklenmedi.

PUT, start/pause/complete ve DELETE için expectedUpdatedAt zorunludur. Satır transaction içinde yüklenir; eski snapshot 409, eksik/bozuk alan 400, yabancı kayıt 404 alır. ORM beforeUpdate kancası updatedAt'i önceki değerden en az 1 ms ileri taşır; hızlı yazma veya saat geri gitmesi aynı sürümü üretmez. Yeni kolon/migration gerekmez. Bulk catalog/FK değişiklikleri ve harici SQL bu optimistic sürüm sözleşmesine dahil değildir; catalog bütünlüğü A10 altında açıktır.

409 alan istemci ilgili hesabın bütün session query görünümlerini yeniler; eski mutation otomatik tekrar edilmez. Formda kullanıcı girdisi korunur, güncel veriye göre yeniden deneme gerekir. Frontend bütün yazma yollarına kullanıcının gördüğü snapshot sürümünü ekler; PUT ile action endpoint'leri aynı servisi çağırır.

## Durum politikası

| Kaynak | Farklı hedef durumlar |
|---|---|
| planned | in_progress, completed, cancelled |
| in_progress | paused, completed, cancelled, planned |
| paused | in_progress, completed, cancelled, planned |
| completed | planned |
| cancelled | planned |

Aynı duruma geçiş geçerli sürümle no-op'tur; değişmeyen alanlarla tekrar tamamlamak completedAt/updatedAt'i değiştirmez. Not/verimlilik ayrıca düzenlenebilir. Stale tekrar yine 409'dur; istemci önce güncel snapshot'ı okumalıdır. completed/cancelled kaydı doğrudan çalıştırmak yerine açık planned geçişi gerekir. completedAt yalnız ilk tamamlamada sunucuda yazılır, yeniden açmada null olur. Mevcut duration gerçek ölçülmüş süreye çevrilmez.

Kullanıcı başına bir in_progress seans olabilir; diğerini başlatmak için mevcut seans duraklatılır/tamamlanır/iptal edilir. Birden fazla paused seans tutulabilir. Bitişi geçmiş planned/paused kayıt başlatılmaz; saat güncellemesi gerekir. Bitişi geçmiş aktif kayıt duraklatılabilir/tamamlanabilir; hata yanıtı sırasında planlanana geri yazma kaldırıldı. GET hâlâ yan etkisizdir; süre dolunca otomatik iptal politikası kurulmadı. Buna dayanarak sonsuz refetch yapan eski günlük/haftalık effect ve taşıma debug çıktıları kaldırıldı.

## Arayüz bağlantıları

Günlük/haftalık takvim, seans formu, günlük özet ve iki Pomodoro yüzeyi sürümlü transport kullanır. Pomodoro mutation yanıtı güncel snapshot olarak tutulur; sorgudan gelen daha eski kopya bunu ezmez. Snapshot değişimi timer fazını başa almaz. Başlatma sunucuda reddedilirse modal sayacı çalışmaya başlamaz.

Tarayıcı kontrolünde ayrı Pomodoro sayfasının büyük Duraklat düğmesinin yalnız yerel isRunning değiştirdiği bulundu; gerçek pause action'a bağlandı. Devam et sunucu start action'ını kullanır. Bekleyen işlem sırasında ilgili timer kontrolleri devre dışıdır. Bu bağlantı düzeltmeleri tick/deadline, reload, background, çoklu sekme sahipliği ve faz/mola ölçümü sorunlarını çözmez; iki motor hâlâ birleştirilmelidir.

## Doğrulama ve operasyon

Son `npm run check` başarılı: **5 contracts + 67 backend + 36 frontend = 108 test**, atlanan yok; strict typecheck, sıfır uyarılı lint, adlandırma ve iki production build başarılı. Kontrol logu /tmp/study-tracker-session-check.log içindedir. Bu pakette bağımlılık değişmedi; temiz npm ci önceki pakette doğrulanmıştı. Anlamlı regresyonlar: dört eşzamanlı create, aynı boş aralığa iki move, bitiş sınırı/örtüşme çeşitleri, partial resize, iptal sonrası yeniden etkinleştirme, eski sürümlü edit/action/delete, monotonic timestamp, eşzamanlı start ve kullanıcı ayrımı, terminal geçişler, tekrar complete, geç duraklatma, ilişki erişimi ve SQL yazmasından sonraki enjekte hatada transaction rollback'i. Bütün DB testleri atılabilir ayrı SQLite dosyasındadır.

Frontend: gerçek HTTP üzerinden bütün yazma türlerinde sürüm taşıma ve 409 cache yenilemesi; modal start → pause → complete sürümü ve reddedilen start; ayrı sayfanın ana pause → resume düğmeleri için component regresyonu. Tam otomatik tarayıcı E2E veya yük testi değildir.

Production bundle ayrı 127.0.0.1:3001 frontend / 5003 API ve atılabilir iki seanslı SQLite fixture'ında açıldı. İlk start başarılı, ikinci eşzamanlı aktif seans 409; ana pause → resume → complete listede ve sayaç özetinde doğrulandı. Büyük pause düğmesindeki yerel-only hata bu testle bulunup düzeltildi ve component regresyonu eklendi. Kanıt repo dışında session-integrity-completed.png (aynı Codex artifact dizini). Test hesabından çıkıldı, sekme/fixture süreçleri kapatıldı, geçici DB temizlendi.

Gerçek kullanıcı DB'sinde migration/seed/reset/restore uygulanmadı; bu paket şema değiştirmez. Yeni API ve frontend birlikte kullanılmalıdır; eski açık sekme yeni sürüm alanını taşımadığı için yazmada 400 alabilir ve yeniden yüklenmelidir. Commit/push/deployment yapılmadı. Güncel açık sıra: A09/A16 → A10 → A15/A17/A18 → bağımlılık/E2E/erişilebilirlik ve kurtarma operasyonları.
