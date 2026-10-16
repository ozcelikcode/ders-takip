# Kalıcı Pomodoro — 16 Ekim 2026

## Kapsam ve kararlar

A15 tamamlandı. PomodoroPage ve planlayıcı modalındaki bağımsız sayaç motorları kaldırıldı; ikisi ortak PomodoroTimer/usePomodoro kullanır. Günlük/haftalık planner işlem tekrarları A21 altında açıktır. Teknik adlar İngilizce, Türkçe içerik korunur; neutral yüzey/tipografi ve isimli kontroller design-system'e uyar.

Sunucu saatin/faz makinesinin sahibidir. 005-pomodoro-clocks, StudySession'a bire bir/cascade PomodoroClock ekler: phase, cycle, remainingMilliseconds, deadlineAt, autoStartBreaks, completedWorkCycles. Eski seanslara bilinmeyen faz/deadline veya ölçüm üretilmez. Legacy aktif sayaç açıkça etkinleştirilir; yeni veya planned seansın start eylemi work/cycle 1 oluşturur. Canlı süre ayarının değişmesi açık planned/reset gerektirir; reset ölçülmüş geçmişi ve kullanıcı notunu silmez.

Çalışma bitince kısa/uzun mola duraklatılmış başlar. autoStartBreaks açıkça seçilirse mola çalışma deadline'ında başlar; mola bitince sonraki çalışma her zaman paused olur. Uzun kesintide en fazla bitmiş çalışma ve seçilmiş mola ilerletilir; kendiliğinden yeni çalışmalar üretilmez. Tarayıcı/modal kapatma, rota değişimi ve reload duraklatma değildir; bu UI'da yazılıdır. Daha önce plan bitişi geçmiş paused seansa resume kısıtı sürer; yeniden planlamak gerekir.

## İşlem ve süre bütünlüğü

POST /api/study-sessions/:id/pomodoro strict command/expectedUpdatedAt sözleşmesi kullanır. resume/pause/reset/complete/configure ortak services/studySessions.ts IMMEDIATE transaction'ından geçer. Configure yalnız boolean autoStartBreaks kabul eder; istemci phase/deadline/counter yazamaz. Genel planner start/pause/complete/reset de aynı sunucu saatini yönetir. Yetki, tek aktif seans, optimistic 409, monoton updatedAt ve terminal durum politikaları korunur. Aynı resume değişiklik yoksa sürüm/deadline üretmez. Clock-only değişim session sürümünü de ilerletir. Hata enjeksiyonunda clock+session+interval birlikte geri alınır.

Scheduler 1 saniyede uyanır; en eski 100 due kaydı yeniden okuyup her birini transaction içinde settle eder. Faz sınırı callback zamanı değil kalıcı deadline'dır. recordActivity yalnız iç sunucu yolu üzerinden boundary alır; kullanıcı tarih yazamaz, önceki interval sonu geri gidemez. Worker geciktiğinde salt okunur GET ve stats açık study/break interval'ını deadline'da keser. Sonradan worker aynı sınırda kapatır; duraklama ayrı ölçülür. Eski untracked/partial coverage ve geçmiş ölçüm korunur.

Scheduler withDatabaseActivity ile bakım kapısına katılır. Restore/reset/snapshot öncesi devam eden arka plan işi boşaltılır; yeni iş başlamaz. Boşaltmada 10 saniyelik kontrollü timeout vardır. Başlangıç due catch-up yapar; kapanış timer'ı durdurup mevcut işi bekler. Koordinasyon tek backend uygulaması kapsamında testlidir; çok süreç operasyonu/yük doğrulaması yapılmadı.

## İstemci, hesap ve sekmeler

Hook sunucu serverNow/deadline gözlemi üzerinden wall-clock ve monotonic geçen sürenin en büyüğüyle görüntü türetir; 250 ms callback yalnız yeniden çizdirir, saniye eksiltmez. Focus/visibility/reconnect yeniden okur. Detail 30 saniyede, due durumunda 2 saniyede; hata varsa 30 saniyede yenilenir. Liste 60 saniyede yenilenir ve önceki günün bitmemiş seansını da bulur. Gizli/offline sorgular TanStack yaşam döngüsüne tabidir. Sıfırda GET yapılır; istemci faz ilerletme mutation'ı göndermez.

Aynı account/session query key sayfa/modal arasında paylaşılır. Eski updatedAt veya aynı sürümün eski server gözlemi yeni snapshot'ı ezmez. Query ve mutation yanıtları auth epoch ile korunur; logout/hesap değişiminden sonraki ack onComplete veya cache'i geri getiremez. Komut reddinde sayaç sunucu onayı olmadan başlamaz; hata görünür, tekrar deneme mümkündür.

Tarayıcı doğrulaması numeric API user.id ile string view query key arasındaki invalidation farkını ortaya çıkardı. Ortak factory artık her ikisini String ile normalize eder; bu ayrıca testlidir. BroadcastChannel yalnız sessions-changed ve userId taşır; özel seans içeriği/kimlik bilgisi göndermez. Diğer cihazlar periyodik/focus okuması ve sunucu optimistic sürümü ile tutarlı kalır; WebSocket kurulmadı.

Günlük/haftalık planner paused Pomodoro play eylemi artık ortak modalı açar; ikinci bir timer başlatmaz. Context menüsündeki Sayacı aç çalışan/paused sayaca erişir. Escape/backdrop/kapat modalı kapatır. Önceki timer'ın olmayan notification.mp3/wav dosyalarına bağlı ses/checkbox implementasyonu kaldırıldı; ses veya push delivery altyapısı eklenmedi. Faz alanı aria-live, progressbar ve isimli kontroller korunur. Tam WCAG denetimi iddiası yoktur.

## Doğrulama

npm run check başarılı: **8 contracts + 116 backend + 51 frontend = 175 test**, atlanan test yok; naming, strict typecheck, sıfır uyarılı lint ve production build geçti. Log: /tmp/study-tracker-pomodoro-check.log. Bu pakette bağımlılık eklenmedi; önceki 12 audit düğümü (5 high/7 moderate) açık backlog'dur.

17 yeni backend regresyonu temp SQLite/Supertest üzerinde: milisaniyeli pause/resume, deadline cap/GET salt okuma, gecikmiş worker, bounded auto-break, uzun/kısa döngü, eşzamanlı worker/komut/stale version, not koruması, genel planner eylemleri, no-op, phase/deadline forgery reddi, atomik rollback, owner/tek aktif kuralı, clock rollback clamp, 005 idempotence/failure/legacy preservation, maintenance drain/skip, session type ve duration dönüşümü, legacy activation, reset/delete cascade. Önceki manuel activityKind testi untimed study kapsamında tutuldu; managed Pomodoro fazını artık sunucu belirler.

Frontend: ack/retry, büyük callback gecikmesi, remount, sıfırda mutation olmaması, eski GET reddi, hesap değişiminde geç ack izolasyonu; önceki gün sayacı, gerçek HTTP command transport, numeric/string account key ve iki planner modal erişimi testlidir. Yeni planner testinde sabit saat/sona ermiş seans kullanılmaz.

Production fixture manuel tarayıcı kanıtı, gerçek kullanıcı DB'sinden ayrı geçici hesap/DB ve API 5003/preview 3001 üzerinde:

- İlk çalışma sunucuda tam 60 saniye sonunda kısa molaya geçti.
- İki sekmede resume/pause bildirimi anında yenilendi; ikisi paused kısa mola 00:57 gösterdi.
- Haftalık paused play ortak modalı açtı; çalışma 2. döngü/01:00 olarak korundu.
- Modal start → kapat → Pomodoro sayfasında 00:55 → reload 00:51; sayım sıfırlanmadı.
- İki sekme de kapatıldı. Yeni sekmede 2. döngü uzun mola 02:00/paused geri geldi; sonraki çalışma otomatik başlamadı.
- Salt okunur fixture DB assertion: çalışma 120 saniye, mola 60 saniye, completedWorkCycles 2, tek açık pause ve kullanıcı notu aynen korunmuş.

Ekran görüntüsü: /Users/ozcelik/.codex/visualizations/2026/10/15/01a13e5c-eabf-70f1-bd97-3a490ffe1079/pomodoro-persistent-clock.png. Fixture'dan çıkış yapıldı; test sekmeleri/sunucuları, geçici DB ve ignored fixture betikleri temizlendi. Bu manuel smoke, otomatik E2E veya yük testi değildir.

## Gerçek yerel yükseltme ve veri koruması

Eski dev süreçleri durduruldu. Native private SQLite snapshot integrity/FK/checksum ile alındı; özel pointer .local/pomodoro-upgrade-2026-10-16.json (0600), snapshot .local altında Git dışındadır. Değerleri/parola/hash'i sohbet veya loga dökülmedi. Açık npm run db:migrate yalnız eksik 005'i uyguladı. Bütün eski tablo satırları snapshot ile karşılaştırıldı; kimlik/parola/oturum/not/zaman/geçmiş dahil aynen korundu. Yeni clock tablosu boştu; geçmiş faz türetilmedi. Güncel şema manuel backup id 5 oluşturuldu. Gerçek DB'de seed/reset/restore veya doğrulama amaçlı test yazması yapılmadı.

Normal startup şema değiştirmez; 005 eksikse açık migration ister. Eski 004 veya daha eski snapshot güncel restore şema kapısını geçmez; ayrı kopyada kontrollü migration/uyumlu uygulama gerekir. Tek root npm run dev localhost:3000/API 5002 üzerinde bırakıldı; log /tmp/study-tracker-pomodoro-dev.log. Commit/push/deployment yapılmadı.

## Sınırlar ve sıradaki işler

Sunucunun duvar saati doğru olmalıdır. İşlem sırasında saat geri gidişinde interval fence ve kalan süre clamp testlidir; saat ileri atlamasının ürün etkisi/NTP operasyonu kapsam dışıdır. İstemcinin sistem saati atlaması display'i yeniden sunucu okumasına kadar etkileyebilir; sunucu ölçümü otoritedir. Kullanıcının fiziksel varlığı veya offline geriye dönük çalışma uydurulmaz; açıkça başlatılmış faz sunucuda deadline'a kadar sürer.

Liste bütün Pomodoro geçmişini okur; büyük veri pagination/kapasite doğrulaması yapılmadı. Polling, rate limit kapasitesi ve çok süreç dağıtımı ayrıca ele alınmalıdır. Günlük/haftalık planner tekrarları A21 altında açıktır. A17/A18/A24 daha sonra diğer araçlarla uygulandı; güncel kalan işler progress.md içindedir.

Zaman callback'inin kesin saat olmadığı ve monotonic clock/sleep sınırları için birincil kaynaklar: [Node timers](https://nodejs.org/docs/latest-v24.x/api/timers.html), [MDN setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout), [MDN performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now). Runtime Node 24'tür; bu paket runtime yükseltmesi değildir.

## Sonraki geliştirmelerle kapanış

Kullanıcı limit nedeniyle başka yapay zekâlarla A17/A18/A24 ve ek düzeltmeleri tamamladı; güncel progress ve kod esas alındı, bu paketler yeniden uygulanmadı. Yarım kalan A15 kapanışı (tarayıcı kanıtı/temizlik/bellek kaydı) tamamlandı. Bütün güncel kodla npm run check yeniden başarılı: **8 contracts + 123 backend + 53 frontend = 184 test**, atlanan yok; naming/strict/lint/production build geçti. Log /tmp/study-tracker-final-integration-check.log.

A24'ün açık kalan normal yerel 006 yükseltmesi de tamamlandı: dev süreçleri durduruldu; native özel snapshot checksum/integrity/FK ile doğrulandı (.local/topic-progress-upgrade-2026-10-16.json özel pointer, 0600). npm run db:migrate sonrası önceki 12 tablonun bütün satırları snapshot ile aynı bulundu; user_topic_progress boş, geçmiş durum türetilmedi. Güncel schema manuel backup id 6 alındı. Gerçek veride seed/reset/restore veya test fixture yazması yok. Tek root npm run dev localhost:3000/API 5002 üzerinde yeniden başlatıldı; log /tmp/study-tracker-final-integration-dev.log. Commit/push/deployment yok.

A17/A18/A24 için önceki kayıtların kanıt sınırı korunur; bu kapanışta onların yeni manuel tarayıcı doğrulaması yapılmadı. Sonraki açık işler progress listesindeki A21/A19/A22/A04'tür.
