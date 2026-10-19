# Ders Takip Sistemi — Aktif Bağlam

Son güncelleme: 18 Ekim 2026, A22 otomatik erişilebilirlik ve Lighthouse. Tarihsel paketler progress.md / implementation/ altında; bu dosya güncel çalışma devridir.

## Temizlik paketi tamamlandı (19 Ekim 2026)

Faz 1–4 uygulandı (implementation/2026-10-19-cleanup.md): check yeşil 18/141/200, E2E 36/36, kaynakta 0 `any`, `no-explicit-any` açık. Faz 5 büyük dosya bölme de uygulandı (216 frontend testi). Açık: major bağımlılıklar, LICENSE, mobil ilk yük, Profil/Ayarlar işlev tekrarı (ürün kararı).

## Temizlik paketi — Faz 4 (18 Ekim 2026)

Kullanım dışı `GET /categories/:id`, `/topics`, `/topics/:id`, `/users/:id` uçları testleriyle silindi; check yeşil (361→359 workspace testi: 18/141/200). Faz 1–3 ve 5 (ölü export/CSS/Tailwind, `.env.example`, bağımlılık, `any`) plan dosyasında bekliyor; commit yok.

## Kalıcı talimatlar

Mevcut projeden disiplinli, sürdürülebilir, ileri düzey mühendislikle devam edilir. Kullanılmayan/eski/tekrarlı/varsayımsal uygulama tutulmaz. Teknik semboller/dosya/klasör/paket ve yeni yorum/log İngilizce; Türkçe UI ve kalıcı lokalize değerler korunur. Strict/kalite kapıları gevşetilmez. Her görev başında bütün memory-bank okunur; AGENTS.md, workingPrinciples.md ve design-system.md geçerlidir.

Kullanıcı başka yapay zekâlarla da çalışabiliyor: güncel progress ve kaynak esas alınır; tamamlanmış işler eski sohbetten tekrar uygulanmaz, mevcut değişiklikler ezilmez. Modern sade nötr Vercel/Geist yönü geçerlidir; pastel/cam/gradyan geçersizdir. Site kimliği admin ayarından gelir; gerçek ad kullanıcı adına seçilmez.

## Güncel paket — A22 erişilebilirlik ve performans tabanı

Giriş/kayıt main/h1; profil/ayarlar/Pomodoro alan etiketleri, şifre/resim ikon adları ve seçimlerin pressed state'i düzeltildi. Header adı görünen kullanıcı/rol içeriğinden türetilir; başlık sırası/admin dt-dd/takvim region semantiği ve düşük kontrastlar düzeltildi. Lighthouse Ara hedefinin 18.5 px genişliğini yakaladı (min 24); WCAG 2.2 target-size axe'a açıkça eklenince iki şifre göster düğmesi de 20→32 px oldu. Persisted renkler/veri değişmedi.

Temiz npm ci ve son npm run check geçti: **18 contracts + 143 backend + 200 frontend = 361 workspace testi**, naming/workspace ve E2E strict/sıfır uyarılı lint/build. Son npm run test:e2e **36/36**: önceki 18 davranış yürütmesi + açık/koyu temalı 18 erişilebilirlik yürütmesi. Chromium/WebKit desktop ve Pixel 7 Chromium 412×839 emülasyonunda **150 axe taraması, sıfır violations**; default kurallar + target-size, exclude/disable yok. 18 raporda aria-hidden-focus/44 raporda color-contrast incomplete kayıtları korunur; tam WCAG sayılmaz. Grafik/select/clipped dialog ve yardımcı teknoloji incelemesi açıktır.

Lighthouse 13.5.0 ile login/dashboard × desktop/mobile × üç bağımsız koşu: **12/12**, tüm accessibility skorları 100. Medyan performance: login 96/67, dashboard 92/61 (desktop/mobile). Best practices login 96/dashboard 100; SEO desktop 92, login mobile 92/dashboard mobile 91. Mobil 90+ hedefi karşılanmadı: login LCP 5.43 sn, dashboard 7.52 sn; TBT 0. İlk coverage yaklaşık 353 KiB unused JS/43 KiB CSS ve 750 ms render-blocking tahmini gösterir; tek sayfa coverage ölü kod kanıtı değildir. Sıradaki öncelik import/route grafiğiyle başlangıç yükünü azaltmak ve aynı koşullarda kıyaslamaktır.

Ölçüm gerçek kullanıcı DB'sinden ayrı mevcut temp app fixture'ında, gerçek form/cookie girişi ve ayrı boş Chromium/CDP profiliyle yapılır. Final URL/başlık/runtime doğrulanır; dış origin engellidir. Yerel sıkıştırmasız HTTP/static ortam üretim/CDN/CrUX değildir; auth hazırlığı korunur. Anonim refresh 401 best-practices, robots.txt SPA fallback SEO skoruna yansır. Üretim cache/sıkıştırma/robots politikası açık kalır. Dev bağımlılıkları axe 4.14.0/Lighthouse 13.5.0 exact pin; audit 12 (5 high/7 moderate) sürer. CI axe/Lighthouse/artifact tanımlı, uzak koşum yok.

Komut/kapsam: tests/e2e/README.md. Son raporlar playwright-report/index.html, lighthouse-report/index.html; ham JSON/screenshot/trace test-results ve lighthouse-results altında Git dışıdır. Ayrıntılı ölçüm/sınırlar implementation/2026-10-18-accessibility-and-lighthouse.md içinde. Önceki commit edilmemiş E2E paketi korundu; commit/push/deploy yok.

Normal final koşuları teardown/veri koruma kontrolünden geçti. Keşif sırasında erken kesilen bir fixture bootstrap'ından boş temp DB dizini kalmıştı; süreç/handle yokluğu ve salt okunur integrity/FK/users 0/sessions 0 doğrulanıp yalnız o sahip olunan dizin silindi. Test runner zorla kesilince finally garantisi yok; bootstrap interrupt cleanup ayrıca güçlendirilebilir. Kapanışta fixture/profile/temp dizini kalmadı.

## Korunan tamamlanmış temel

- A01–A14 erişim/atomik seans-katalog/tercih/cache ve oturum-kurtarma düzeltmeleri progress'te. Seans HTTP yazmaları IMMEDIATE transaction/expectedUpdatedAt; tek aktif seans, durum tablosu, stabil completedAt, monoton updatedAt, stale 409. duration plan dakikası; SessionInterval gerçek study/break/pause ölçümü; geçmiş ölçüm uydurulmaz.
- A15 sunucu sahipli PomodoroClock/deadline/faz/döngü ve tek usePomodoro/PomodoroTimer. Mola opt-in, sonraki çalışma otomatik başlamaz; GET/stats ölçümü deadline'da keser. Sayfa/modal kapatma duraklatmaz; bakım scheduler'ı da boşaltır.
- A16 Luxon/IANA gün sınırları ve CalendarDate görünüm adaptörü; synthetic Date API instant değildir. calendarViewInstant/wallTimeToInstant gerekir; grid iki DST fold satırı üretmez.
- A17 global admin/toplu kullanıcı ölçümü, A18 runtime kayıt/bakım/timeout, A24 kalıcı UserTopicProgress; A19 ortak auth/user/Plan/backup Zod4/DTO ve Plan isteğe bağlı hedef kabı ayrımı tamamdır. A21 admin/modal/today/katalog/ortak planner tamamlanan kapsamları yeniden yazılmaz.
- A22 önceki Header hata/boş/stale/epoch, roving takvim/native saat-süre, kısa kart sütunları/min28px/24px hedef/gün sonu36px ve kapalı dialog commit sonrası odak dönüşü korunur. İlk E2E alt paketi implementation/2026-10-18-isolated-browser-tests.md içinde.

## Yerel ortam / veri koruması

İlk kurulum kullanıcı yetkisiyle admin@example.com / username admin oluşturuldu. Parola yalnız .local/admin-password.txt (0600/Git dışı); okunmadı/değişmedi/değeri belgelenmez. Gerçek .env/DB/.local/backups test fixture değildir. Tek root dev localhost:3000/API 5002 sağlıklı; log /tmp/study-tracker-e2e-dev.log.

Yerel schema 006 korunur. Önceki normal003/004/005/006 yükseltmeleri native özel snapshot/veri koruma karşılaştırmalarıyla yapıldı. Son pointer .local/topic-progress-upgrade-2026-10-16.json; güncel schema backup id6. Pointer/snapshotlar silinmez. Bu görevde gerçek DB'ye test yazması/migration/seed/reset/restore yok. Eski şema snapshot current restore tarafından reddedilir; ayrı kopyada kontrollü yükseltme gerekir.

## Sıradaki açık işler

1. A22 ölçülmüş mobil ilk yük: route/import grafiği/ortak başlangıç JS-CSS ayrımı; aynı Lighthouse koşulunda önce/sonra, üretim sıkıştırma/cache/robots sınırları. Mobil 67/61, hedef 90+ açık.
2. A22 manual incomplete/ekran okuyucu, grafik metinsel veri alternatifi, fiziksel touch, DST fold, admin/Pomodoro/native drag-resize E2E kapsamı; uzak CI ve bootstrap interrupt cleanup.
3. A04 offsite/saklama/kapasite/yük/kurtarma operasyonları ve kalan güvenlik/major bağımlılıklar. React18/Recharts2/Router6/Tailwind3 zincirinin bütün major geçişleri yapılmış değildir.

**Ürün yönü kararlaştırıldı (19 Ekim 2026):** alan/kitle bağımsız, global ve değişken odaklı sistem; TYT/AYT veya yalnız öğrenci zorunluluğu yoktur. Sıralı yol haritası progress.md'nin başındadır (R1–R8 ve R9'un büyük kısmı yapıldı; kalan: Tailwind 4 geçişi (audit'teki son 7 bulgu). Gerçek DB'de 007 migration'ı 19 Ekim 2026'da kullanıcı onayıyla uygulandı; öncesinde `backend/backups/pre-007-migration-20261019-220239.sqlite` kopyası alındı). AI/sosyal/offline aktif öncelik değildir.
