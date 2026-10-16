# Ortak planlayıcı — 16 Ekim 2026

## Kapsam

Kullanıcı kalan işlerden devam istedi. Güncel progress ve başka araçlarla tamamlanan A17/A18/A24 esas alındı; eski sohbet listesi uygulanmadı. A21'in günlük/haftalık planner ortaklaştırma alt paketi tamamlandı. Öğrencinin kendi ders/konularını yönetme UI'ı ve diğer modal/admin tasarım geçişleri ayrı açık A21 işleridir. A19/A22/A04 kapanmadı.

WeeklyPlanner ve DailyCalendar artık aynı PlannerCalendar'a yalnız mode veren küçük girişlerdir. Ortak işlem/state katmanı usePlannerCalendar; kart CalendarSessionCard; zaman/segment/snap kuralları calendarGeometry içindedir. Aynı iş kuralının ikinci uygulaması ve eski takvim motorları kaynakta tutulmadı. Kullanılmayan WeeklySchedule/DragItem/DropTarget tipleri ve eski formatTime yardımcı yolu referans kontrolüyle kaldırıldı. Backend endpoint, DB şeması ve bağımlılık değişmedi. Biçimlendirme için geçici npm exec Prettier 3.9.10 kullanıldı; projeye formatter bağımlılığı/lock değişikliği eklenmedi.

## Davranış

- Günlük 64 px, haftalık 48 px/saat; her ikisi 24 saat, ortak nötr yüzey, başlık ve durum/adlandırılmış kontroller kullanır. Kart rengi yalnız ince sol şerittir. 08:00 ilk viewport, hafta/gün okları, bugün, sürüklerken 800 ms yön üzerinde gezinme ve önceki/sonraki dönem bırakma alanı korunur.
- Drag 15 dakikaya, resize 5 dakikaya snap eder; resize 5 dakika–24 saatle sınırlıdır. Negatif/sonraki güne kayan drop başlangıcı görünür günün 00:00–23:45 sınırına alınır. Preview ve commit aynı saf kurallardan gelir; mouse konumu bırakma anında yeniden hesaplanır.
- Tarih taşıma, grid drop ve dönem taşıma aynı moveSessionTimes yolunu kullanır. Planlanan gerçek end-start süresi korunur; yuvarlanmış duration üzerinden yeni süre uydurulmaz. Saat dilimi ortak CalendarDate → gerçek instant dönüşümündedir; eksik/çift DST saati hata olarak kalır.
- Önceki iki motorun çelişen gece yarısı kısıtları ve resize'da 23:59:59.999'a sessiz kırpması kaldırıldı. Mevcut backend'in 24 saatlik aralık sözleşmesi uygulanır; geceyi kesen seans günlere bölünür. Yalnız başlangıç segmenti sürüklenir; yalnız bitiş segmentinden resize yapılır. Sonraki günün yarım kartını sürükleyip seansın başlangıcını yanlış güne taşıma önlenir. Görünen süre plan süresidir; ölçülen çalışma üretilmez.
- Running/completed kartlar drag/resize kabul etmez. Server yetki, aralık çakışması, durum ve optimistic expectedUpdatedAt otoritesi olarak kalır. Yerel çakışma tahmini sunucu kontrolünün yerini almaz. Start/pause/complete/delete ve tarih/süre yazmaları tek perform sınırından, senkron busy ref ile geçer; hızlı çift tıklama ikinci istek üretmez. Sunucu onayına kadar sahte başarı/sıra gösterilmez.
- 409 otomatik yazma tekrarı değildir. Güncel sorgu okunur; açık moving/confirmation snapshot'ı yenilenir. Hedef tarih ve ay seçimi korunur; güncel kaynak saati pencerede görünür. Kullanıcının yeni onayı güncel sürümle yazar. Başarısız okuma/taşıma boş veya başarılı durum gibi sunulmaz. Auth epoch değişmişse geç mutation ack cache yenilemesi/başarı bildirimi üretmez.
- Resize pointermove/up/cancel ile yürür; Escape, blur, görünür dönem veya timezone değişimi iptal eder. Preview bitmeden async yazma yapılmaz; drag/resize sonrası gelen click edit/create açmaz. Dokunmatik uçtan uca doğrulama yapılmadı.
- Planlayıcı modalı mevcut ortak Pomodoro hook/engine'ini kullanır. Modal kapatma/minimize, yeniden açma ve sunucu deadline politikası değiştirilmedi. Seans kartı tıklaması gerçek edit formunu açar; küçük kart ve sağ tık için aynı işlemler düğmesi/penceresi vardır.

## Ortak dialog ve zaman düzeltmeleri

MoveSessionModal Headless UI Dialog'a taşındı: odak sınırı/Escape/dışarı kapatma, tarih düğmesi erişilebilir adı ve seçili durum korunur. Pending sırasında kapanmaz; false sonucu hata olarak açık bırakır. Kaynak refresh'i hedef seçimini sıfırlamaz. Başka seansa geçiş yeni açılışta başlatılır.

ConfirmDialog nötr token/yüzey kullanır; yalnız yıkıcı eylem kırmızıdır. Async callback beklenir, aynı anda çift onay engellenir, pending'de kapatılamaz. false sonucu açık kalır, beklenmeyen exception görünür hata verir. Mevcut void callback çağrıları uyumludur. Hata callback'ini kendi içinde yutup void döndüren eski çağıranlar bu yeni başarısızlık sözleşmesine otomatik çevrilmiş değildir; kalan yüzeyler A21 altında izlenir.

Yeni fractional-duration testi, calendarViewInstant'ın CalendarDate milisaniyesini düşürdüğünü buldu. Ortak adaptör artık wallTimeToInstant sonucuna görünümün milisaniyesini ekler. Zaman dilimi/DST reddi değişmez; offset ISO/persisted kontrat veya eski veri yeniden yazılmaz. Contracts testi ve planner taşıma testi tam round-trip'i doğrular.

## Doğrulama

npm run check: **8 contracts + 123 backend + 74 frontend = 205 test**, atlanan yok; naming, strict typecheck, sıfır uyarılı lint ve production build başarılı. Log /tmp/study-tracker-shared-planner-check.log. Frontend'de 21 yeni davranış testi:

- Geometry (6): iki grid yüksekliğinde eşit snap/resize ve sınırlar, fractional gerçek süre, geceyi kesen segmentler, DST gap/fold reddi/gerçek süre ve running/completed kilidi.
- Planner (12; günlük/haftalık aynı matris): gerçek event drag/resize, sunucu onayı/sürüm, ikinci yazmayı engelleme, Escape iptali, eski sürümde refetch ve hedefi koruyarak açık retry, geç auth ack izolasyonu ve GET hata/yeniden deneme.
- ConfirmDialog (3): async onay bekleme/duplicate/kapama kilidi, false sonrası açık retry ve beklenmeyen hata.

Önceki üç planner/Pomodoro erişim testi dahil bütün eski regresyonlar geçer. Hiçbir test atlanmadı veya strict ayarı gevşetilmedi.

Production derlemesi 127.0.0.1:3001 / API 5003 üzerinde ayrı temp SQLite ve öğrenci hesabıyla gerçek tarayıcıda kontrol edildi:

1. Haftalık 09:00/60 dk seans native drag ile 11:15'e taşındı.
2. Kart alt kenarı pointer ile 30 dakika uzatıldı; başlık 90 dk oldu.
3. İşlemler → Tarihe taşı → ertesi gün; günlük görünümde ve reload sonrası aynı 11:15/90 dk kartı göründü.
4. Gerçek edit formu ertesi gün, 11:15, 90 dk ve 12:45 bitişi gösterdi; Escape ile kapandı.
5. 5 dakikalık kart ve geceyi kesen seansın iki günlük segmenti görüldü.
6. Salt okunur fixture DB assertion: 3 planlanmış seans, taşınan seans ertesi gün 11:15–12:45/90 dk, bütün kullanıcı notları ve diğer iki seans aynen korunmuş; session_intervals boş, integrity/FK temiz.

Görsel kanıt: /Users/ozcelik/.codex/visualizations/2026/10/15/01a13e5c-eabf-70f1-bd97-3a490ffe1079/shared-planner-verified.png. Hesaptan çıkıldı; sekme, fixture süreçleri, temp DB ve ignored fixture script/config dosyaları temizlendi. Bu manuel smoke, otomatik E2E veya yük testi değildir. Stale retry/auth epoch ilaveleri component testinde doğrulandı; son küçük retry değişikliği için ayrı ikinci manuel tarayıcı turu yapılmadı.

Statik production çıktısında PlannerPage route chunk yaklaşık 91.58 kB/gzip 18.16 kB'den 59.34 kB/gzip 15.42 kB'ye indi; son build'in gerçek rakamı logdan izlenir. Bu route dosyası kıyasıdır; bütün ilk ekran, ağ gecikmesi, Lighthouse veya kullanıcı performans skoru değildir.

## Yerel ortam ve açık sınırlar

Gerçek DB'de migration/seed/reset/restore veya test verisi yazılmadı; schema 006 korunur. Güncel contracts/Vite ön derleme belleği için tek root dev temiz yeniden başlatıldı: localhost:3000 / API 5002, /tmp/study-tracker-shared-planner-dev.log. Önceki geliştirmeler korundu; commit/push/deployment yok.

A21'in öğrenci özel ders/konu düzenleme-silme UI'ı ve kalan modal/admin tasarım tutarlılığı sonraki iştir. A19 contracts/Plan kararı; A22 tam klavye/dokunmatik takvim, E2E/WCAG/Lighthouse; A04 offsite/retention/kapasite/kurtarma operasyonları açıktır. 12 bağımlılık audit düğümü önceki kaydın açık backlog'udur, bu pakette yeniden audit/major geçiş yapılmadı.

Tekrarlanan DST saatine ayrı satır, çok kısa komşu kartlarda çakışmasız minimum hit alanı, takvimde roving keyboard focus ve büyük veri/yük ölçümü uygulanmadı. Ortaklaştırma bütün erişilebilirlik veya performans backlog'unu kapatmaz.
