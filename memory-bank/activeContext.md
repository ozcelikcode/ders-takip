# Ders Takip Sistemi — Aktif Bağlam

Son güncelleme: 15 Ekim 2026, oturum ve kurtarma paketi.

## Kullanıcının kalıcı talimatları

Proje vibe coding sonrasında disiplinli, derli toplu ve sürdürülebilir mühendislikle geliştirilecek. Gereksiz/eskimiş/tekrarlı kod tutulmayacak. Kod sembolleri, paketler, dosya ve klasör adları İngilizce olacak; Türkçe kullanıcı içeriği korunacak. AGENTS.md ve `workingPrinciples.md` bu kuralları içerir. ASCII kontrolü otomatik; isimlerin İngilizce anlamı kod incelemesinin sorumluluğudur.

## Güncel paket ve yerel kurulum

Kullanıcı “Henüz kurulum yapmadım; yerel admin oluşturulsun” diyerek ilk kurulumu açıkça yetkilendirdi. Yeni backend/.env ve database.sqlite oluşturuldu; migration'lar ve admin CLI çalıştırıldı. Admin e-postası admin@example.com, kullanıcı adı admin. Rastgele parola yalnız `.local/admin-password.txt` içinde 0600 izinlidir; değerini belgeye/sohbete/loga taşımayın. Dosya ve DB Git dışında. Gerçek yerel veride reset/restore/seed yapılmadı.

İptal edilebilir AuthSession/RefreshCredential, `002-auth-sessions`, hash'li tek kullanımlık refresh, HttpOnly cookie/CSRF kontrolü ve kısa access JWT uygulandı. Logout/parola/rol/aktiflik değişimi ilgili oturumları iptal eder. Frontend access token'ı yalnız bellekte tutar; ortak refresh, epoch kontrolü, Web Locks/BroadcastChannel ve çevrimdışı logout niyeti geç yanıtla geri girişi engeller.

SQLite native snapshot/atomik destination restore, dış manifest/checksum/şema doğrulaması, güvenlik yedeği/rollback, bakım kapısı, transaction'lı reset ve geçen süreye göre 1/5/7 günlük otomatik yedek uygulandı. Eski fs.copy/process.exit ve refresh JWT/localStorage yolları kaldırıldı. Manifesti olmayan eski yedekler korunur, restore devre dışıdır. Çoklu instance/offsite/retention operasyonları tamamlanmış değildir.

Son `npm run check`: **43 backend + 14 frontend = 57 test**, atlama yok; strict typecheck, sıfır uyarılı lint, adlandırma ve iki production build başarılı. Tarayıcıda yeni admin girişi, reload ile oturum devamı ve manuel yedek oluşturma doğrulandı. Tek yerel dev süreci localhost:3000 / API 5002'de çalışır durumda bırakıldı; süreç sonradan durmuşsa `npm run dev` kullanılır. Commit/push/deployment yok.

Detaylar ve kanıt sınırları: `implementation/2026-10-15-security-and-recovery.md`. A11 Preferences hâlâ açık; sıradaki pakette ortak tercih sözleşmesi ve kullanıcı/tarih cache kapsamı ele alınacak.

## Tasarım paketinin kaydı


Kullanıcı modern, basit, sade, Vercel benzeri bir ürün arayüzü istedi. Güncel resmî Geist/Linear referansları incelendi. Eski pastel/iOS/glass yönü kaldırıldı; `design-system.md` kalıcı görsel standarttır.

Ortak kabuk, navigasyon, başlık/panel/düğme token'ları; dashboard, dersler, planlayıcı, auth, Pomodoro ve kullanıcı ayarları yenilendi. Geist font yerel yükleniyor; konfeti/paketleri ve planner'daki iki eski ts-ignore kaldırıldı. Mobil menü odak/Escape yönetiyor; mobil planner günlük açılıyor. Takvim 24 saati koruyup 08:00'den başlıyor; günlük özet açılır biçimde. Pomodoro tipografik sayaç, ince progressbar ve isimli nötr kontroller kullanıyor; motor davranışı ayrı backlog'da.

Dashboard yanlış TYT/AYT sayımları yerine ders/konu/tamamlanan seans ve kaydedilen süreyi kullanır. Son aktivite/bildirimler ortak, cache'i değiştirmeyen zaman sıralamasından gelir; üç regresyon testi eklendi.

Tasarım paketi kapanışındaki tarihsel npm run check: 22 backend + 8 frontend = 30 test, typecheck/lint/build başarılı. Dolu geçici veriyle masaüstü/açık-koyu tema ve 390×844 mobil kontrolü, arama, günlük özet, form ve özel seans oluşturma geçti. Tam E2E/WCAG/Lighthouse iddiası yok. A11 tercihler senkron hatası UI'da da doğrulandı; çözülmedi. Gerçek kullanıcı verisine dokunulmadı. Test oturumu/sekmesi/sunucusu kapatıldı ve geçici DB temizlendi.

## İlk uygulama paketinin tarihsel kaydı

- İngilizce teknik adlandırma kuralı ve otomatik kontrol eklendi. Workspace adları study-tracker / @study-tracker/backend / @study-tracker/frontend. Saat/dakika grafik alanları hours/minutes oldu; kalıcı Türkçe veri değerleri değiştirilmedi.
- Node 24.21.0 ve npm 11.19.0 tanımlandı; tek kök lock dosyası artık izlenebilir. Temiz `npm ci` doğrulandı. Native kurulum script izinleri paket sürümüne göre daraltıldı.
- Vite 8.3.4, React plugin 6.1.2, ESLint 10.12.0, typescript-eslint 8.71.2, Vitest 5.0.4 ve sqlite3 6.0.1 kullanılıyor. Eski Jest/nodemon/ts-node ve kullanılmayan doğrudan paketler kaldırıldı; geliştirme için tsx kullanılıyor.
- Frontend'deki 50 TS hatası strict ayarları korunarak giderildi. Her iki workspace'in typecheck/build'i ve sıfır uyarılı lint'i geçiyor.
- Yedi erişilemeyen frontend modülü, eski alternatif seed/setup ve debug/silme script'leri, eski geliştirme prompt'u ve hesap listesi kaldırıldı. Login ekranındaki geçersiz demo hesap bilgileri kaldırıldı.
- app.ts sunucu/cron başlatmadan import edilebiliyor; index.ts başlangıç/kapanış sorumluluğunda. Env şeması sabit JWT fallback'i kaldırdı; eksik/zayıf/örnek veya eşit anahtarda başlangıç durur. CORS FRONTEND_URL'den okunur; API varsayılan portu 5002.
- Açılıştaki tablo silme/sync kaldırıldı. Şema `npm run db:migrate` ile açık baseline migration ve schema_migrations kaydı üzerinden hazırlanıyor. Mevcut eksik kolonlar sessizce onarılmıyor. Development seed yalnız açık kimlik bilgisiyle çalışır; mevcut veriyi/parolayı sıfırlamaz.
- Ders görünürlüğü sahibi/global/admin politikasında ortaklaştırıldı; ders/konu/kullanıcı detay okumaları ve oturumun ders/konu ilişkileri sınırlandırıldı.
- GET session listesi artık kayıt durumunu/notlarını değiştirmiyor. Backend request-body/debug logları kaldırıldı. Hata katmanı Sequelize hatalarını güvenli 400/409 yanıtlarına çeviriyor; MongoDB kalıntıları kaldırıldı.
- Backup aynı DB_PATH kaynağını kullanıyor; gerçek snapshot içinde test kullanıcısı sayısı doğrulandı. Snapshot/restore güvenliği bütünüyle çözülmüş değildir.
- Sayfalar lazy loading ile ayrıldı, ErrorBoundary eklendi. Hesap kimliği değişince QueryClient cache ve eski sorgular temizleniyor; geç sorgu yanıtının yeni hesabı ezmediği test edildi.
- `npm run check` ve GitHub Actions CI workflow eklendi. CI'nin GitHub üzerinde çalıştığı iddia edilmiyor; yerel eşdeğer komut doğrulandı.

## İlk paketin tarihsel doğrulaması

- Temiz npm ci; adlandırma, typecheck, lint, test ve backend/frontend build kontrolleri.
- Backend: gerçek HTTP + geçici SQLite kullanan 22 test; frontend: 5 test. Toplam 27 test, atlanan yok.
- Tarayıcı smoke: production bundle, geçici DB/hesap; giriş → dashboard → haftalık/günlük planner. Genel tarayıcı E2E altyapısı değildir.
- Bundle analizi: ana girişin statik JS grafiği 424.182 bayt / gzip 142.359 bayt. Login ekranıyla birlikte 519.151 / gzip 168.708 bayt. Aktif sayfanın ek chunk'ları ayrıca yüklenir. Başlangıçta tek JS 1.367,31 kB / gzip 381,61 kB idi. Ağ/Lighthouse ölçümü değildir.
- Lock tabanlı audit: 12 etkilenen paket düğümü; 0 critical, 5 high, 7 moderate. Kalanlar raporda açık; sayı benzersiz CVE veya doğrulanmış exploit sayısı değildir.
- Kullanıcının gerçek DB'si, ortam dosyası ve hesapları üzerinde seed/migration/reset/restore çalıştırılmadı. Bütün DB doğrulamaları geçici dosyalarda yapıldı; tarayıcı fixture sunucusu kapatıldı ve verisi temizlendi.

## Sıradaki işler

1. Ortak Preferences/API şeması, mevcut JSON için açık dönüşüm, hata/kaydetme durumu; kullanıcıya bağlı tercih/bildirim saklama ve tarih/query key/invalidation.
2. StudySession oluşturma/taşımada atomik çakışma ve ortak durum makinesi; planlanan/gerçek süre ayrımı ve timezone.
3. Diğer çok adımlı ders/kategori/konu silme/sıralama işlemlerinin transaction bütünlüğü.
4. Tek timer/planner motoru, doğru dashboard/admin agregasyonları ve uygulanmayan yönetim ayarları.
5. Kalan bağımlılık açıkları ve React/Recharts/Router/Tailwind modernizasyonu; her geçiş ayrı uyumluluk doğrulamasıyla yapılmalı. TypeScript 5.9.3; bütün paketler en yeni major'a geçirilmiş sayılmaz.
6. Otomatik tarayıcı E2E, mobil/klavye, performans ve gerçek ortam kurtarma/kapasite/offsite doğrulaması.

Başlangıç incelemesi `audits/2026-10-15-project-audit.md`, ilk paket `implementation/2026-10-15-foundation.md` içinde tarihsel kalır. Güncel kapanış durumu progress.md; son paket implementation/2026-10-15-security-and-recovery.md içindedir.

## Geçmiş tasarım yönü

Aralık 2025'te planner iOS/pastel, sky/cyan ve glassmorphism yönünde düzenlenmişti. Bu görünüm 15 Ekim 2026 kullanıcı talimatıyla geçersiz kılındı; güncel yön design-system.md içindedir. Ürün eğitim/TYT-AYT ile genel görev takibi arasında farklı anlatımlar taşıyor; yeni özellikten önce yön netleştirilmeli. AI, sosyal ve offline özellikler aktif öncelik değildir.
