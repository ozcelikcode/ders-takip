# Ders Takip Sistemi — Aktif Bağlam

Son güncelleme: 17 Ekim 2026, A21 site ayarları/yedekleme alt paketi. Tamamlanmış paket geçmişi progress.md ve implementation/ belgelerindedir; bu dosya güncel çalışma devridir.

## Kalıcı talimatlar ve kaynak sırası

Kullanıcı mevcut projeden disiplinli, sürdürülebilir ve ileri düzey mühendislikle devam edilmesini istedi. Gereksiz/eski/tekrarlı/varsayımsal kod tutulmaz. Teknik adlar/dosya/klasör/paket ve yeni yorum/log İngilizce; Türkçe UI ve kalıcı lokalize değerler korunur. Strict ve kalite kapıları gevşetilmez. Her görev başında bütün memory-bank okunur; AGENTS.md, workingPrinciples.md ve design-system.md geçerlidir.

Kullanıcı limit nedeniyle başka yapay zekâlarla çalışabiliyor. Güncel progress + mevcut kaynak esas alınır; eski sohbetten tamamlanmış işler yeniden açılmaz veya mevcut değişiklikler ezilmez. Geçmiş test sayıları ile güncel toplam ayrılır. Modern sade nötr Vercel/Geist yönü geçerlidir; pastel/cam/gradyan yönü geçersizdir. Görünen site kimliği admin ayarıdır; gerçek isim kullanıcı adına değiştirilmez.

## Güncel paket — A21 site ayarları ve yedekleme

Site ayarları ve yedekleme alt paketi tamamlandı. AdminSettingsPage nötr tasarım ve etiketli alanlar kullanır; pristine form yeni okumayı izler, düzenlenen taslak refetch/bölüm değişiminde korunur. Shared schema ile yalnız değişen alanlar kaydedilir; no-op yazmaz, hata taslağı korur. Private settings read/write revision + account generation geç yanıtı sınırlar. Public hata private hatayı ezmez.

BackupPanel hesaplı Query ile loading/error/retry/boş listeyi ayırır. Restore yalnız verified === true ise açılır; dirty taslakta restore/reset kapalıdır. Ayar/yedek/restore/reset tek busy/mount/epoch hook'u ve async ConfirmDialog kullanır; pending kapama/çift gönderim kilitlidir. Restore ack sonrası protected refetch öncesinde logout; reset ack sonrası account invalidation + private settings yeniden okuma vardır. Native confirm/gecikmeli reload kaldırıldı. Bildirim teslimatı/offsite/saklama altyapısı uygulanmış gibi gösterilmez.

npm run check: **10 contracts + 130 backend + 138 frontend = 278 test**, atlanan yok; naming/strict/lint/production build başarılı. Yeni 18 ekran testi frontend/tests/admin-settings.test.tsx, 4 store yarış/sınır regresyonu var. Son frontend strict/root lint tekrar geçti. Temp production fixture: taslak/bölüm/dirty kilit, verified/unverified liste, manuel backup create/refetch, restore Escape/odak ve settings_only iptal doğrulandı. Temp snapshot checksum/integrity ve hesap/site ayarı korunması kontrol edildi; kaydedilmemiş taslak DB'ye yazılmadı. Tarayıcı restore/reset final onayı verilmedi; gerçek servis davranışları mevcut temp SQLite testlerinde geçer. Fixture sekme/süreç/DB temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002 sağlıklı; log /tmp/study-tracker-user-management-dev.log. Detay: implementation/2026-10-17-admin-settings-and-backups.md.

**Sıradaki:** A21 diğer modal/admin (özellikle yönetim özeti) nötr yüzey/kullanılmayan yol son denetimi; ardından A19 auth/user update/backup/plan DTO ve Plan ürün anlamı. A22/A04 ve bağımlılık backlog'u açık.

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

1. A21 diğer modal/admin (özellikle yönetim özeti) nötr yüzey/kullanılmayan yol son denetimi. Kategori/kullanıcı/ayar-yedekleme yönetimi, öğrenci katalog UI ve ortak planner tamamdır; yeniden uygulanmayacak.
2. A19: auth/user/plan/backup doğrulamalarını ortak contracts'a taşıma; Plan API ile StudySession planner ilişkisinin ürün anlamını netleştirme.
3. A22/A04: tam klavye/dokunmatik takvim ve otomatik E2E/WCAG/Lighthouse; kurtarma/kapasite/offsite/retention operasyonları; kalan güvenlik/major bağımlılık işleri. Önceki audit backlog'u 12 paket düğümü (5 high/7 moderate); bütün kütüphaneler en yeni major değildir.

Ürün eğitim/TYT-AYT ve genel görev takibi anlatımlarını birlikte taşır; yeni ürün kapsamı kararı kullanıcı adına alınmaz. AI/sosyal/offline aktif öncelik değildir. Detaylı açık/kapalı durum ve kanıtlar progress.md'dedir.
