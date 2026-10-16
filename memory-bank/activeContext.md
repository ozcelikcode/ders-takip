# Ders Takip Sistemi — Aktif Bağlam

Son güncelleme: 16 Ekim 2026, A21 öğrenci katalog düzenleme alt paketi. Tamamlanmış paket geçmişi progress.md ve implementation/ belgelerindedir; bu dosya güncel çalışma devridir.

## Kalıcı talimatlar ve kaynak sırası

Kullanıcı mevcut projeden disiplinli, sürdürülebilir ve ileri düzey mühendislikle devam edilmesini istedi. Gereksiz/eski/tekrarlı/varsayımsal kod tutulmaz. Teknik adlar/dosya/klasör/paket ve yeni yorum/log İngilizce; Türkçe UI ve kalıcı lokalize değerler korunur. Strict ve kalite kapıları gevşetilmez. Her görev başında bütün memory-bank okunur; AGENTS.md, workingPrinciples.md ve design-system.md geçerlidir.

Kullanıcı limit nedeniyle başka yapay zekâlarla çalışabiliyor. Güncel progress + mevcut kaynak esas alınır; eski sohbetten tamamlanmış işler yeniden açılmaz veya mevcut değişiklikler ezilmez. Geçmiş test sayıları ile güncel toplam ayrılır. Modern sade nötr Vercel/Geist yönü geçerlidir; pastel/cam/gradyan yönü geçersizdir. Görünen site kimliği admin ayarıdır; gerçek isim kullanıcı adına değiştirilmez.

## Güncel paket — A21 katalog düzenleme

Öğrencinin kendi özel ders/konusunu düzenleme ve ders silme/konu arşivleme arayüzü tamamlandı. Arşivden geri alma ve arşivde düzenleme eklendi. CourseEditorModal öğrenci/admin create/edit için tek uygulamadır; TopicEditorModal da create/edit'i birleştirir. Eski iki create modalı ve admin içindeki ikinci CourseModal kaldırıldı. Ortak dialog/ikon/yetki ve mutation sınırı vardır; shared contracts doğrulaması, değişen alanları gönderme, taslak/hata/pending koruması ve account epoch izolasyonu testlidir. Ders listesi/detayı ve admin ders yönetimi nötr tasarım sistemine taşındı. Restore sırasında aktif aynı ad çakışması transaction içinde 409 ile reddedilir; ilerleme/geçmiş korunur.

`npm run check`: **8 contracts + 125 backend + 90 frontend = 223 test**, atlanan yok; naming/strict/lint/production build başarılı. Son erişilebilir drag-handle adı eklemesinden sonra ilgili frontend typecheck/lint/5 component testi/build tekrar geçti. Production fixture'da öğrenci ders/konu edit, arşiv UI/geri alma/reload ve admin ortak ders create doğrulandı. Temp SQLite kontrolünde completed ilerleme, seans notları/bağlantıları ve 300 ölçülmüş saniye korundu; FK temiz. Tarayıcıdaki son kalıcı silme onayı iptal edildi; silme API/SQLite regresyonlarında testlidir. Fixture süreçleri/sekmesi/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002 çalışır; log /tmp/study-tracker-shared-planner-dev.log. Commit/push/deployment yok. Detay: implementation/2026-10-16-catalog-editing.md.

**A21 kalan:** kategori/kullanıcı/ayar ve diğer modal/admin yüzeylerinde nötr tasarım tutarlılığı. Öğrenci katalog UI ve ortak planner tamamdır; A19/A22/A04 açık kalır.

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

1. A21 kalan: kategori/kullanıcı/ayar ve diğer modal/admin yüzeylerinin nötr tasarım tutarlılığı. Öğrenci özel ders/konu düzenleme-silme/arşiv/geri alma UI ve planner ortaklaştırması tamamdır.
2. A19: auth/user/plan/backup doğrulamalarını ortak contracts'a taşıma; Plan API ile StudySession planner ilişkisinin ürün anlamını netleştirme.
3. A22/A04: tam klavye/dokunmatik takvim ve otomatik E2E/WCAG/Lighthouse; kurtarma/kapasite/offsite/retention operasyonları; kalan güvenlik/major bağımlılık işleri. Önceki audit backlog'u 12 paket düğümü (5 high/7 moderate); bütün kütüphaneler en yeni major değildir.

Ürün eğitim/TYT-AYT ve genel görev takibi anlatımlarını birlikte taşır; yeni ürün kapsamı kararı kullanıcı adına alınmaz. AI/sosyal/offline aktif öncelik değildir. Detaylı açık/kapalı durum ve kanıtlar progress.md'dedir.
