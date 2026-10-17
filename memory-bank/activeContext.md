# Ders Takip Sistemi — Aktif Bağlam

Son güncelleme: 17 Ekim 2026, A22 kısa takvim kartlarının yerleşimi. Tamamlanmış paket geçmişi progress.md ve implementation/ belgelerindedir; bu dosya güncel çalışma devridir.

## Kalıcı talimatlar ve kaynak sırası

Kullanıcı mevcut projeden disiplinli, sürdürülebilir ve ileri düzey mühendislikle devam edilmesini istedi. Gereksiz/eski/tekrarlı/varsayımsal kod tutulmaz. Teknik adlar/dosya/klasör/paket ve yeni yorum/log İngilizce; Türkçe UI ve kalıcı lokalize değerler korunur. Strict ve kalite kapıları gevşetilmez. Her görev başında bütün memory-bank okunur; AGENTS.md, workingPrinciples.md ve design-system.md geçerlidir.

Kullanıcı limit nedeniyle başka yapay zekâlarla çalışabiliyor. Güncel progress + mevcut kaynak esas alınır; eski sohbetten tamamlanmış işler yeniden açılmaz veya mevcut değişiklikler ezilmez. Geçmiş test sayıları ile güncel toplam ayrılır. Modern sade nötr Vercel/Geist yönü geçerlidir; pastel/cam/gradyan yönü geçersizdir. Görünen site kimliği admin ayarıdır; gerçek isim kullanıcı adına değiştirilmez.

## Güncel paket — A22 kısa takvim kartlarının yerleşimi

Kısa seansların minimum tıklama yüksekliği, komşu kartları saat sınırları üzerinden örtebiliyordu. Ortak calendarGeometry artık gerçek piksel başlangıcı ve en az 28 px görsel yükseklik üzerinden bağlı çakışma grupları kurar; serbest sütunları yeniden kullanır ve eşit başlangıçta ID ile stabil sıralar. Kayıtların UTC başlangıç/bitiş/süre/durum/not değerleri değiştirilmez. İptal edilmiş ve diğer görünür kartlar aynı yerleşime katılır. Her etkileşim sütunu en az 160 px; boş haftalık günler 104 px kalır. Header ve saatler aynı kolon şablonunu kullanır, yoğun günlerde yatay kaydırma vardır. Gün sonunda 36 px boşluk son dakika kartını ve odak çerçevesini korur.

Kart başlığı/ikon hedefleri en az 24 px olarak 28 px kabuğa sığar; 68 px altı kompakt satırdır. Kısa kartta hedefi örten resize tutamacı kaldırıldı (36 px altı); mevcut Saat ve süreyi değiştir alternatifi korunur. Büyük kartlarda pointer resize devam eder. Takvim başlangıcında saniye/milisaniye korunur; hiçbir kaydın zamanı kaydırılmaz. Günlük/haftalık aynı motoru kullanır; DOM sırası görünür başlangıç/ID sırasıdır.

Doğrulama: **18 contracts + 142 backend + 200 frontend = 360 test**, atlanan yok; npm run check naming/strict/lint/production build geçti. Son görsel boşluk/sıra düzenlemesinden sonra frontend strict, kök lint, 200 test ve production build tekrar geçti. Yeni 4 geometry ve günlük/haftalık toplam 4 component regresyonu var. Ayrı temp production fixture'da 1 dakikalık komşu kartlar/iptal kaydı, klavye menüsü/Escape/odak ve 23:59 hedefi kontrol edildi. Beş seansın bütün kolonları eski snapshot ile aynı; interval üretilmedi, integrity/FK temiz. Gerçek kullanıcı DB'si/şema/bağımlılıklar değişmedi. Fixture sekme/süreç/temp veri temizlendi; root dev 3000/API 5002 korunur.

A22 bütünüyle kapanmadı: gerçek dokunmatik cihaz, DST fold, tam WCAG/ekran okuyucu, Lighthouse ve otomatik gerçek tarayıcı E2E açık. A04/bağımlılık backlog'u sürer. Ayrıntı: implementation/2026-10-17-calendar-card-layout.md.

Önceki A22 Header popover/hata/boş/stale/epoch ve takvim tek Tab/ok/native saat-süre akışları tamamdır. A19 auth/user/Plan/backup ortak Zod 4 sözleşmeleri ve Plan/StudySession ayrımı korunur; bu işler yeniden açılmayacak. Önceki ayrıntılar implementation/ belgelerindedir.

## Korunan tamamlanmış temel

- A01–A14 kapsamındaki yetki/atomik seans-katalog/tercih/cache ve oturum-kurtarma düzeltmeleri progress tablosunda izlenir. Bütün seans HTTP yazmaları IMMEDIATE transaction ve expectedUpdatedAt kullanır; tek aktif seans, durum tablosu, stabil completedAt, monoton updatedAt ve stale 409 korunur. duration plan süresidir; SessionInterval çalışma/mola/pause gerçek süreyi tutar, eski ölçüm uydurulmaz.
- A15: sunucu sahipli PomodoroClock/deadline/faz/döngü; ortak usePomodoro/PomodoroTimer; mola opt-in, sonraki çalışma otomatik başlamaz. GET/stats worker gecikmesinde ölçümü deadline'da keser. Sayfa/modal kapatmak duraklatmaz. Bakım kapısı scheduler işini de boşaltır. Kaynak implementation/2026-10-16-pomodoro-continuity.md.
- A16: Luxon/IANA gün sınırı/gerçek süre kesişimi ve CalendarDate görünüm adaptörü. Sentetik Date doğrudan API instant'ı değildir; calendarViewInstant/wallTimeToInstant gerekir. Grid iki DST fold satırı üretmez.
- A17: admin global özet ve includeStats toplu kullanıcı özeti uygulanmış/testli; N+1 UI yolu kaldırıldı. A18: allowRegistration/maintenanceMode/sessionTimeout runtime'da uygulanmış/testli; bildirim delivery yok, maxStudentsPerCourse kaldırıldı. A24: kullanıcıya özel UserTopicProgress + GET/PUT ve CourseDetailPage kalıcılığı uygulanmış/testli. Bunlar yeniden yapılmayacak; manuel UI ve yük kanıt sınırları progress.md'de korunur.
- Auth: iptal edilebilir DB session/hash'li tek kullanımlık refresh, HttpOnly/SameSite/CSRF, memory-only access/epoch ve sekmeler arası koordinasyon. Native WAL snapshot/checksum/integrity/FK/şema, safety/rollback/bakım ve geçen güne göre backup var; offsite/retention/çok süreç operasyonu açık.

## Yerel ortam / veri koruması

Kullanıcının açık ilk kurulum talimatıyla admin@example.com / username admin oluşturuldu. Parola yalnız .local/admin-password.txt (0600/Git dışı); değeri sohbet/log/belgeye yazılmaz. .env/DB/.local/backups Git dışındadır. Uygulama localhost:3000, API 5002; tek root npm run dev temiz contracts/Vite --force başlangıcıyla bırakılır.

Yerel schema 006'dır. 003/004/005/006 normal yükseltmelerinden önce private native snapshot alındı, eski kayıtlar korundu. Son 006 pointer .local/topic-progress-upgrade-2026-10-16.json; önceki 12 tablonun bütün satırları karşılaştırıldı, güncel schema manuel backup id 6 alındı. Reset/restore/seed veya gerçek DB'de test yazması yapılmadı. Eski schema snapshot current restore tarafından reddedilir; ayrı kopyada kontrollü yükseltme/uyumlu sürüm gerekir. İlgili önceki pointer/snapshot dosyaları silinmez. Yeni testler yalnız temp SQLite kullanır ve temizlenir.

## Sıradaki açık işler

1. A22 kalan: otomatik gerçek tarayıcı E2E, tam WCAG/ekran okuyucu, Lighthouse, gerçek dokunmatik cihaz ve DST fold.
2. A04 ve bağımlılıklar: kurtarma/kapasite/offsite/retention operasyonları; kalan güvenlik/major bağımlılık işleri. Önceki audit backlog'u 12 paket düğümü (5 high/7 moderate); bütün kütüphaneler en yeni major değildir.

Ürün eğitim/TYT-AYT ve genel görev takibi anlatımlarını birlikte taşır; yeni ürün kapsamı kararı kullanıcı adına alınmaz. AI/sosyal/offline aktif öncelik değildir. Detaylı açık/kapalı durum ve kanıtlar progress.md'dedir.
