# Proje Teknik İncelemesi — 15 Ekim 2026

> Bu belge uygulama öncesi başlangıç fotoğrafıdır. Aynı gün başlayan düzeltmelerin güncel durumu progress.md ve implementation/2026-10-15-foundation.md içindedir; aşağıdaki eski yol/sürüm/satır konumları tarihsel kanıttır.

## Kapsam ve sonuç

İncelenen Git durumu: `90e13cc5b58bdc36be07663fa949d2f7b2834e37`; son commit 1 Ocak 2026. İnceleme başlangıcında çalışma ağacı temizdi. Altı memory-bank dosyası ve AGENTS.md okundu; manifestler, yapılandırmalar, kaynak envanteri, import ilişkileri ve kritik backend/frontend akışları incelendi. Backend/frontend kaynaklarında 87 TypeScript/TSX dosyası, 20.361 satır ve 181 `any` sözcüğü sayıldı. Bunlar kalite puanı değildir; bakım alanının büyüklüğünü gösterir.

**Değerlendirme:** Geniş bir ürün prototipi mevcut; güvenlik, veri bütünlüğü, sözleşmeler ve kalite kontrolleri üretime hazır olma iddiasını desteklemiyor. Özellik geliştirmeye dönmeden önce güvenilir bir temel kurulmalı. Mevcut koddan kontrollü olarak devam etmek uygundur; bütünüyle yeniden yazımı gerektiren bir kanıt bulunmadı.

Bu çalışma uygulama davranışını değiştirmedi. Gerçek veritabanına bağlanılmadı; seed, reset, restore ve şema değiştirme komutları çalıştırılmadı. Bağımlılıklar lifecycle script'leri kapalı olarak kuruldu. SQLite native bileşeninin çalışma durumu ve canlı arayüz/E2E davranışı doğrulanmadı.

## Kanıt seviyeleri

- **Doğrudan doğrulama:** Derleyici, lint/test komutu, paketleme, gerçek Joi şeması ve deterministik yol çözümlemesi.
- **Kontrollü controller deneyi:** Gerçek derlenmiş controller fonksiyonları, sahte kullanıcı/kayıt ve bellek içi model taklitleriyle çağrıldı. Kontrol akışındaki eksikleri gösterir; gerçek HTTP/veritabanı entegrasyon testi değildir.
- **Statik bulgu:** Kaynakta görülen davranış ve eksik kontrol. Eşzamanlılık, mobil etkileşim ve kesinti senaryoları ayrıca çalıştırılmalıdır.
- **Öneri:** Uygulanmamıştır; kabul ölçütüyle birlikte sonraki iş olarak ele alınmalıdır.

P1: Kullanıcı verisi, güvenlik veya temel akışta ciddi hata. P2: İşlevsel doğruluk ve bakım açısından önemli sorun. P3: Temel sorunlar kapandıktan sonra iyileştirme. Öncelikler CVSS değildir.

## Çalıştırılan kontroller

Ortam: Node `24.21.0`, npm `11.19.0`. Repoda lock dosyası olmadığından sonuçlar 15 Ekim 2026 tarihinde manifest aralıklarından çözümlenen bağımlılıklara aittir; önceki geliştiricinin kurulumuyla aynı olduğu iddia edilmez.

| Kontrol | Sonuç |
|---|---|
| `npm install --ignore-scripts --package-lock=false --no-audit --no-fund` | Başarılı; 840 paket eklendi. Kullanımdan kaldırılmış bağımlılık uyarıları alındı. |
| `npm run build:backend` | Başarılı; TypeScript hatası yok. Sunucu çalıştırma testi değildir. |
| `npm run build:frontend` | Başarısız; 50 TypeScript hatası, Vite aşamasına geçemedi. |
| `npm run lint` | Backend'de ESLint yapılandırması bulunamadı; frontend'e geçmedi. |
| `npm run lint:frontend` | Ayrı çalıştırıldı; burada da ESLint yapılandırması yok. |
| Backend Jest komutu | Test bulunamadı, çıkış kodu 1. Repoda test dosyası bulunmadı. |
| Yalnız Vite paketleme, çıktı `/tmp` altında | Başarılı; resmî frontend build'inin başarılı olduğu anlamına gelmez. |
| Paketleme boyutu | JS 1.367,31 kB, gzip 381,61 kB; CSS 87,52 kB, gzip 13,05 kB. JS sourcemap 5.770,45 kB. |
| Controller/şema/yol deneyleri | İzinsiz okuma, ilişki doğrulama eksikliği, güncellemede çakışma kontrolü eksikliği, tercih şeması reddi ve yedekleme yolu farkı doğrulandı. |

Frontend hatalarının dağılımı: 37 kullanılmayan değişken/import (`TS6133`), 1 kullanılmayan tip (`TS6196`), 2 olası undefined (`TS18048`), 5 optional alan atama uyuşmazlığı (`TS2412`), 1 olmayan `toast.info` API'si (`TS2339`), 2 `canvas-confetti` tip bildirimi eksikliği (`TS7016`), 2 optional prop/argüman uyuşmazlığı (`TS2375`, `TS2379`). Hatalar yalnız biçimsel temizlikten oluşmuyor.

## Mevcut mimariyi anlama

- npm workspace: `backend` ve `frontend`; tek repo ve tek dağıtılabilir uygulama yaklaşımı.
- Backend: Express 4, TypeScript, Sequelize 6, SQLite. Sekiz model: User, Category, Course, Topic, Plan, StudySession, Settings, Backup.
- Kategoriler mevcut kodda global ve yazmaları admin'e açık. Dersler kişisel veya global; konular derse bağlı. Oturumlar ve planlar kullanıcıya bağlı. Memory-bank'in önceki kişisel kategori anlatımı doğru değildi.
- Controller'lar HTTP, yetki, iş kuralları ve ORM erişimini birlikte içeriyor. Ayrı bir iş kuralı/service katmanı yok.
- Frontend: React 18 SPA; React Router 6, TanStack Query 5, Zustand 4; formlarda React Hook Form ve Zod 3. Backend'de Joi ve Zod 4 birlikte kullanılıyor.
- Günlük/haftalık takvimlerde sürükleme ve boyutlandırma ayrı uygulanıyor. Modal Pomodoro ve ayrı Pomodoro sayfasının iki farklı sayaç motoru var.
- Global ayarlar key/value tablosunda; kişisel tercihler User.preferences JSON alanında. Ön/arka yüzün bu JSON için aynı sözleşmesi yok.
- `App.tsx` sayfaları doğrudan import ediyor; route lazy loading ve React ErrorBoundary bulunmuyor. Belgelerdeki bu özellikler uygulanmış kabul edilemez.

## P1 bulgular

### A01 — Özel kayıtların okunmasında sahiplik kontrolü eksik

**Dayanak:** `backend/src/controllers/courseController.ts:63`, `:87`, `:299`; `topicController.ts:5`, `:53`; `userController.ts:65`; `backend/src/routes/users.ts:19`.

Ders listesi kullanıcı/global filtresi uygularken tek ders ve dersin konuları ID üzerinden sahiplik filtresi olmadan okunuyor. Konu listesi ve konu detayı da kullanıcıya göre sınırlandırılmıyor. `/api/users/:id` oturum açmış herhangi bir kullanıcıya başka kullanıcının e-posta ve tercihlerini döndürebiliyor. Parola response'tan çıkarılıyor; bu durum diğer kişisel alanların açığa çıkmasını önlemiyor.

**Deney:** Kullanıcı 1 ile kullanıcı 2'ye ait özel ders sorgusunda controller 200 döndürdü. Diğer kullanıcı detayı da 200 döndü; konu listesi sorgusunda kullanıcı/kurs görünürlük kapsamı bulunmadı.

**Düzeltme:** Ders görünürlüğü için tek politika: sahibi veya global veya admin. Konu erişimi üst dersin görünürlüğünden türetilmeli. Kullanıcı detayı kendisi/admin ile sınırlandırılmalı; response alanları açık DTO ile seçilmeli.

**Kabul:** İki öğrenci + bir admin ile liste/detay/ilişki uçlarının tamamında erişim matrisi test edilmeli. Bir öğrencinin özel kaydı diğer öğrenciye hiçbir listede veya detayda dönmemeli.

### A02 — Kimlik doğrulama, eksik ayarda sabit anahtarla devam ediyor

**Dayanak:** `backend/src/index.ts:10`; `backend/src/scripts/seed.ts:32`; `backend/src/utils/jwt.ts`.

JWT_SECRET yoksa kaynakta bulunan sabit anahtarlar atanıyor; production istisnası yok. Bu konfigürasyonda kullanıcı ID'si bilinen bir hesap adına geçerli imzalı token oluşturulabilir. Middleware rolü veritabanından okuduğundan iddiadaki `role` alanını değiştirmek tek başına yetki yükseltmez; risk bilinen kullanıcı kimliğinin taklididir. JWT_REFRESH_SECRET'in tek başına eksikliği de başlangıçta doğrulanmıyor. Seed varsayılan admin parolasını kullanıyor ve parolayı logluyor.

**Düzeltme:** Zorunlu ve yeterince güçlü anahtarlar için başlangıç şeması; eksik/hatalı ayarda başlamama. Demo seed'ini açık geliştirme ortamıyla sınırlandırma; gerçek admin kurulumunda açık kimlik bilgisi sağlama ve parola loglamama.

**Kabul:** Eksik/zayıf ayarla production başlangıcı başarısız olmalı; sessiz fallback bulunmamalı. Doğrulanmış dağıtımda bu anahtarların kullanıldığı tespit edilirse anahtarlar ve oturumlar yenilenmeli.

### A03 — Yedekleme ve uygulama farklı veritabanı dosyalarını hedefliyor

**Dayanak:** `backend/src/config/database.ts:4`; `backend/src/controllers/backupController.ts:7`, `:51`, `:108`.

Veritabanı `backend/database.sqlite`; controller yolu repo kökündeki `database.sqlite`. Hem src hem dist dizin yapısında bu fark oluşuyor. Kökte dosya yoksa yedek başarısız olur; varsa uygulamanın aktif verisi yerine başka bir dosya yedeklenir/geri yazılır. Yol farkı deterministik deneyle doğrulandı.

**Düzeltme:** Yapılandırmadan türeyen tek mutlak DB yolu; backup/restore bu kaynağı kullanmalı.

**Kabul:** Geçici test veritabanına işaretçi kayıt yaz → yedek al → kaydı değiştir → yedeği ayrı veritabanına aç → kayıt içeriğini doğrula. Development ve derlenmiş çalıştırmada aynı sonuç alınmalı.

### A04 — Yedek/geri yükleme işlemi tutarlılık ve kurtarma güvencesi taşımıyor

**Dayanak:** `backupController.ts:48`, `:51`, `:108`; `backend/src/index.ts:151`.

Açık veritabanı koordinasyon olmadan `fs.copy` ile kopyalanıyor. Geri yüklemede canlı bağlantı kapanıyor; kopya hatasında yeniden açılmıyor. Yeni istekler durdurulmuyor; geçici dosyada bütünlük kontrolü, atomik değiştirme ve başarısızlıkta geri dönüş yok. `process.exit(0)` sonrası otomatik yeniden başlatmayı sağlayan bir supervisor repo içinde tanımlı değil. Yedek metadata'sı snapshot'tan sonra aynı DB'ye yazılıyor; geri yüklenen dosyanın katalogla tutarlılığı tasarlanmamış.

Cron ayarı yalnız açılışta okunuyor. `*/5` ve `*/7` ayın günlerini böler; kesintisiz her beş/yedi gün anlamına gelmez. Ay sınırında aralık değişir ve UI'dan ayar değiştirmek çalışan işi yeniden planlamaz. Zaman dilimi açık tanımlanmamış.

**Düzeltme:** SQLite online backup API veya uygun `VACUUM INTO` tabanlı snapshot; bütünlük doğrulaması, tekil işlem kilidi, restore bakım akışı ve hata kurtarma. Aralık takibi `lastSuccessfulBackupAt`/`nextRunAt` üzerinden yapılmalı; ayar değişikliği iş planını güncellemeli. Kaynak: [SQLite Backup API](https://www.sqlite.org/backup.html).

**Kabul:** Aktif yazma, eşzamanlı yedek, bozuk dosya, eksik dosya, kopya hatası, process restart ve ay sınırı senaryoları ayrı doğrulanmalı. RPO/RTO hedefleri belirlendikten sonra gerçek kurtarma tatbikatı yapılmalı.

### A05 — Listeleme isteği çalışma durumunu ve kullanıcı notlarını değiştiriyor

**Dayanak:** `backend/src/controllers/studySessionController.ts:18`.

GET listeleme, bitiş zamanı geçmiş bütün in_progress kayıtlarını cancelled yapıyor ve `notes` alanını otomatik metinle eziyor. İstatistik okuması, bildirim sorgusu ve beş saniyelik Pomodoro polling'i de bu işleme yol açabilir. İş kuralının uygulanma zamanı kullanıcının sayfa açmasına bağlı; girilmiş not kaybolabilir.

**Düzeltme:** Okumalar yan etkisiz olmalı. Zaman aşımı ayrı, idempotent bir durum geçişi olmalı; sistem nedeni kullanıcı notundan ayrı saklanmalı. Çalışmanın planlanan bitişi aşınca ne olacağı ürün kuralı olarak tanımlanmalı.

**Kabul:** Tekrarlanan GET istekleri kayıt durumunu ve notları değiştirmemeli. Zaman aşımı işlemi iki kez çalıştırıldığında aynı sonucu üretmeli.

### A06 — İlişkili ders/konu seçimi kullanıcı erişimine göre doğrulanmıyor

**Dayanak:** `studySessionController.ts:212`, `:259`.

Oturum oluştururken planın sahibi kontrol ediliyor; courseId ve topicId için ders görünürlüğü, konu-ders eşleşmesi ve aktiflik kontrolü yok. Kullanıcı kendi oturumunu başka kullanıcının özel ders/konusuna bağlayabilir; include üzerinden bu kaynakların alanlarını okuyabilir. Foreign key yalnız kaydın varlığını korur.

**Deney:** Kullanıcı 1'in, kullanıcı 2'nin özel dersine ve verilen konuya bağlı oturum oluşturma controller yolu 201 döndürdü; ders/konu erişimi için sorgu çalışmadı.

**Düzeltme/kabul:** Tüm ilişkiler tek iş kuralı içinde doğrulanmalı. Başkasının özel dersi, yanlış derse ait konu ve pasif kaynak kombinasyonları reddedilmeli; global ders geçerli senaryo olarak test edilmeli.

### A07 — Oturum taşımada çakışma kontrolü yok; oluşturma kontrolü atomik değil

**Dayanak:** `studySessionController.ts:227`, `:357`; `frontend/src/components/planner/WeeklyPlanner.tsx:316`.

Oluşturmada kontrol var; güncelleme yeni saatleri doğrudan kaydediyor. Frontend kontrolü API çağrıları ve eşzamanlı kullanıcı etkileşimleri için güvence sağlamaz. Oluşturmada kontrol ile insert arasında transaction/serileştirme yok; iki aynı aralık isteği kontrolü birlikte geçebilir.

**Deney:** Saat güncellemesinde yalnız hedef oturumu bulan tek sorgu çalıştı; controller 200 döndü, çakışma sorgusu yoktu. Eşzamanlı insert yarışı statik risk olarak tespit edildi, canlı DB'de denenmedi.

**Düzeltme/kabul:** Oluşturma ve taşımada ortak aralık kuralı, atomik yazma ve açık 409 yanıtı. SQLite için uygulanabilir transaction/serileştirme yaklaşımı seçilmeli; PostgreSQL seçilirse uygun veritabanı kısıtı ayrıca değerlendirilmeli. Bitişe tam eşit başlangıç geçerli; kısmi/tam örtüşme ve iki eşzamanlı istek test edilmeli.

### A08 — Genel update uç noktası durum makinesini atlıyor

**Dayanak:** `studySessionController.ts:375`, `:496`, `:562`, `:623`; `routes/studySessionRoutes.ts:69`.

Start/pause uçlarında geçiş kontrolü varken genel PUT herhangi bir geçerli status değerini atayabiliyor. Tamamlanmış oturum geri planlanınca completedAt temizlenmiyor. Complete işlemi önceki durumdan bağımsız ve tekrarlandığında completedAt'i değiştiriyor. Birden çok aktif oturumun kuralları da tanımlı değil.

**Düzeltme/kabul:** Açık geçiş tablosu ve sunucu tarafında tek uygulama; terminal durum, yeniden açma ve tekrar deneme davranışları tanımlanmalı. Güncel sürüm/updatedAt üzerinden eski istemci yazması algılanmalı. İzin verilmeyen geçişler bütün endpoint'lerde reddedilmeli.

### A09 — Planlanan süre gerçek çalışma süresi olarak raporlanıyor

**Dayanak:** `studySessionController.ts:505`, `:623`; `backend/src/controllers/planController.ts:282`; `frontend/src/components/dashboard/WeeklyProgressChart.tsx:69`.

Başlatma gerçek başlangıcı kaydetmiyor. Pause/resume aralıkları tutulmuyor. Complete, iki dalda da planlanan endTime-startTime farkını kaydediyor; beş dakika sonra tamamlanan bir saatlik plan bir saat çalışma sayılıyor. Plan istatistiği ayrıca tamamlanmamış oturumların sürelerini de toplam çalışma saatine katıyor. Mola türleri için metrik ayrımı yok.

**Düzeltme:** Plan zamanı ile çalışma kaydı ayrılmalı: scheduledStart/End ve gerçekleşen çalışma aralıkları veya startedAt/pausedAt/accumulatedActiveSeconds. Tamamlanma zamanı ve durum geçişleri sunucuda hesaplanmalı. Mevcut duration değerleri geçmişte ölçülmüş gerçek süre gibi dönüştürülmemeli; tarihsel belirsizlik açık tutulmalı.

**Kabul:** 60 dakikalık plan → 5 dakika çalış → 3 dakika ara → 5 dakika çalış → tamamla senaryosunda 10 dakika çalışma ve 3 dakika mola ölçülmeli. Erken bitirme, gece yarısı, tekrar complete ve ağ kopması test edilmeli.

### A10 — Çok adımlı silme/sıfırlama işlemleri kısmi veri kaybına açık

**Dayanak:** `backupController.ts:71`; `courseController.ts:288`; `categoryController.ts:180`; `topicController.ts:449`; `models/index.ts:15`.

`settings_only` oturumları, planları ve konuları siliyor; dersleri silmeden kategorileri silmeye çalışıyor. Mevcut ders varsa RESTRICT ilişkisi nedeniyle işlem bu noktada başarısız olabilir; önceki silmeler transaction olmadığı için kalır. İsim yalnız ayarları çağrıştırmasına rağmen çalışma geçmişi siliniyor. Ders silme, kategori taşıma ve konu sıralaması da transaction kullanmıyor; sıralama yorumundaki transaction ifadesi gerçek kodla uyuşmuyor.

**Düzeltme/kabul:** Her işlemin veri kapsamı açık tanımlanmalı; bağımlılık sırası ve transaction uygulanmalı. Hedef kategori kendisi olamaz. Her aşamaya hata enjekte edildiğinde önceki veri korunmalı. Reset öncesi geri dönüşü doğrulanmış snapshot ve anlaşılır kapsam önizlemesi bulunmalı.

### A11 — Kullanıcı tercihleri ön/arka yüz arasında uyumsuz

**Dayanak:** `frontend/src/store/userPreferencesStore.ts:8`, `:77`; `backend/src/utils/validation.ts:134`; `backend/src/models/User.ts:18`.

Frontend `theme: system`, düz bildirim alanları, dailyStudyGoal/weeklyStudyGoal ve Pomodoro alanları gönderiyor. Joi yalnız light/dark, iç içe notifications ve studyGoals kabul ediyor. Model ise workGoals kullanıyor. Frontend önce yerelde kaydediyor; başarısız sunucu senkronizasyonunu yalnız console'a yazıyor. Tercih kaydedilmiş görünse de kalıcılık sağlanmıyor.

**Deney:** Gerçek Joi şeması `{theme:'system'}`, `{theme:'dark',defaultPomodoroDuration:25}` ve model biçimindeki `{theme:'dark',workGoals:...}` payload'larının üçünü de reddetti.

**Düzeltme/kabul:** Tek Preferences sözleşmesi, mevcut JSON için sürümlü dönüşüm, açık kaydetme/hata durumu. Her tercih güncelle → yeniden giriş → yeniden yükle → başka cihaz/istemciden oku senaryosunda aynı sonucu vermeli.

### A12 — Frontend üretim derlemesi bozuk; kalite kapıları çalışmıyor

**Dayanak:** Çalıştırılan kontroller tablosu, `frontend/src/components/modals/EditTopicModal.tsx:128`, workspace package.json dosyaları.

50 derleyici hatası var; ESLint yapılandırması, test dosyaları, CI workflow ve frontend test komutu yok. Eski progress belgesindeki lint/Prettier, code splitting ve tüm temel özellikler tamam iddiaları doğrulanmadı.

**Düzeltme/kabul:** Önce mevcut strict ayarlarını koruyarak gerçek build hataları giderilmeli; ardından desteklenen lint araç zinciri, davranış odaklı testler ve CI kurulmalı. Temiz checkout'ta kilitli kurulum, typecheck, lint, backend/frontend testleri ve build tek doğrulanabilir akışta geçmeli. Hata bastırma veya `--passWithNoTests` tamamlanma ölçütü olamaz.

### A13 — Oturum iptali ve refresh yaşam döngüsü eksik

**Dayanak:** `authController.ts:148`, `:194`, `:323`; `utils/jwt.ts`; `frontend/src/store/authStore.ts:137`; `frontend/src/services/api.ts:47`.

Access ve refresh token localStorage'da. Backend refresh doğruladıktan sonra yenilerini üretse de önceki refresh'i geçersiz kılacak kayıt/jti/token ailesi yok. Logout yalnız başarı yanıtı veriyor; parola değişimi eski token'ları iptal etmiyor. Belgelerdeki HttpOnly cookie ve güvenli rotasyon uygulanmamış. Refresh interceptor yalnız localStorage'ı değiştiriyor; bellekteki Zustand token'ları eski kalıyor. Sonraki store yazması eski token'ı tekrar kalıcılaştırabilir. Aynı anda 401 alan istekler için tekil refresh kontrolü yok.

**Düzeltme/kabul:** Sunucuda iptal edilebilir oturum ve refresh tekrar-kullanım kontrolü; kısa access süresi; uygun HttpOnly/Secure/SameSite cookie tasarımı ve dağıtım kökenine uygun CSRF kontrolü. İstemcide tek token kaynağı ve ortak refresh promise'i. Logout/parola değişimi sonrası eski refresh reddedilmeli; eşzamanlı 401 tek yenileme üretmeli; geç yanıtla bitmiş oturum dirilmemeli.

## P2 bulgular

### A14 — Query cache kullanıcı ve tarih kapsamından bağımsız

**Dayanak:** `frontend/src/main.tsx:12`; `authStore.ts:72`; `GoalsOverview.tsx:32`; `PomodoroPage.tsx:35`; `services/api.ts:70`.

QueryClient uygulama ömrü boyunca aynı. Çıkışta cache temizliği yok; kişisel sorgu anahtarlarında kullanıcı ID'si bulunmuyor. Aynı tarayıcıda A'dan çıkıp B'ye girildiğinde A'nın taze cache'i B'ye gösterilebilir. Kişisel tercihler ve readNotifications da kullanıcıdan bağımsız localStorage anahtarlarında. Günlük sorgularda tarih anahtarda değil; gece yarısı/hafta değişimi bazı alanlarda eski kapsamı koruyabilir. Mutation invalidation'ları dashboard, haftalık grafik ve diğer oturum anahtarlarını tutarlı kapsamıyor.

**Düzeltme/kabul:** Query key factory: kaynak+kullanıcı+normalize filtre/tarih; auth sınırında devam eden sorguları iptal etme ve cache temizliği; kişisel localStorage kapsamı. A→B hesap değişimi, geç gelen A isteği, gece yarısı ve görev tamamlandıktan sonra tüm özetlerin güncellenmesi test edilmeli.

### A15 — İki Pomodoro motoru sayacı tarayıcı tick'leriyle yürütüyor

**Dayanak:** `frontend/src/pages/pomodoro/PomodoroPage.tsx:62`, `:78`; `components/planner/PomodoroTimer.tsx:57`, `:71`.

Sayaç saniyede bir azaltılıyor; arka plan sekme kısıtlaması/uyku zaman kaymasına yol açabilir. Faz bitişinde state updater içinde başka state değişimleri ve yan etkiler var. Sayaç ve faz state'i kalıcı değil; yeniden yükleme/yeniden mount süreyi başa alabiliyor. Modal sürümü session nesnesi değişiminde yeniden başlatılıyor. İki uygulama aynı durum kurallarına bağlı değil.

**Düzeltme/kabul:** Tek timer hook/domain motoru; deadline ve birikmiş aktif süre, açık faz geçişi, kalıcı oturum, yeniden bağlanma ve çoklu sekme sahipliği. Uyku/arka plan, reload, modal kapatma, sayfa değiştirme, faz sıfırı ve çift tamamlama senaryoları sahte saat + tarayıcı testiyle doğrulanmalı.

### A16 — Tarih aralığı sunucu saat dilimine ve başlangıç tarihine bağlı

**Dayanak:** `studySessionController.ts:43`; `WeeklyProgressChart.tsx:60`; `frontend/src/store/userPreferencesStore.ts:29`.

`new Date('yyyy-MM-dd')` UTC gün başlangıcıdır; ardından end.setHours sunucu yerel saat dilimini kullanır. Europe/Istanbul kullanıcısının 00:00–03:00 kayıtları gün aralığından dışarıda kalabilir. Yalnız startTime aralığına bakıldığı için gece yarısını kesen kayıtların ikinci güne katkısı yanlış olur. Kullanıcı timezone tercihi veri aralığı hesabında kullanılmıyor.

**Düzeltme/kabul:** Taşınan zamanlar UTC instant; gün sınırları tanımlı kullanıcı timezone'unda üretilmeli. Aralıklar [başlangıç,bitiş) olmalı; kesişim ve metriklerin günlere bölünmesi açık kural olmalı. İstanbul ve UTC sunucularında aynı gün sonucunun alınması, 00:30 kaydı, geceyi kesen oturum ve desteklenecekse DST senaryoları test edilmeli.

### A17 — Dashboard ve admin metrikleri yanlış veri sözleşmesi kullanıyor

**Dayanak:** `frontend/src/pages/dashboard/DashboardPage.tsx:12`, `:29`; `pages/admin/AdminDashboardPage.tsx:12`, `:28`, `:34`; `backend/src/controllers/userController.ts:8`; `courseController.ts:34`.

Dashboard konu dahil etmeden ders çekip topics.length topluyor; category nesnesini TYT/AYT string'iyle karşılaştırıyor. Admin toplam kullanıcıyı varsayılan 10 kişilik sayfanın length'i üzerinden gösteriyor. Admin oturum toplamı ortak kullanıcı endpoint'inden geliyor; backend admin için de yalnız o admin'in kendi oturumlarını döndürüyor. Dersler varsayılan olarak aktif filtrelendiği için bazı toplamlar da tüm veri toplamı değil.

**Düzeltme/kabul:** Ürün anlamı belirli sunucu aggregate endpoint'leri; global yönetim metriklerine admin yetkisi. 11+ kullanıcı, kişisel/global ders, 2 kullanıcıda oturum ve pasif kayıt içeren fixture ile tam sayılar doğrulanmalı. Veri alınamaması sıfır kayıt gibi gösterilmemeli.

### A18 — Yönetim ayarlarının bir bölümü yalnız görünür değer

**Dayanak:** `frontend/src/pages/admin/AdminSettingsPage.tsx:320`; `frontend/src/store/settingsStore.ts:10`; `backend/src/controllers/authController.ts:6`; `backend/src/controllers/settingsController.ts:29`; `backend/src/routes/settingsRoutes.ts:10`.

allowRegistration, maintenanceMode ve sessionTimeout saklanıyor; kayıt ve istek yürütmesinde uygulanmıyor. Yedek aralığı açılışta okunuyor. Bütün ayarlar kategori ayırmadan kimliksiz GET ile dönüyor; bugün aktif secret ifşası doğrulanmadı fakat ileride güvenlik ayarı eklemek bu API'den sızabilir. Ayar yazmada izinli anahtar/tip şeması yok.

**Düzeltme/kabul:** Public appearance DTO'su ile admin ayarları ayrılmalı; desteklenen ayarlar için açık şema ve sunucu uygulaması olmalı. Kayıt kapalıyken doğrudan POST reddedilmeli; bakım kapsamı ve admin istisnası açıkça test edilmeli. Uygulanmayan ayar kullanıcıya çalışıyormuş gibi sunulmamalı.

### A19 — Hata katmanında eski MongoDB kalıntıları var

**Dayanak:** `backend/src/middleware/errorHandler.ts:19`, `:24`, `:29`; `backend/src/utils/validation.ts`; `backend/src/middleware/validate.ts`.

Merkezi handler Mongoose CastError ve 11000 duplicate kodunu ele alıyor; SequelizeValidationError, UniqueConstraint ve ForeignKeyConstraint durumlarını doğru sınıflandırmıyor. Beklenen istemci hatası 500 olabilir; iç error.message response'a taşınabilir. Joi middleware parse edilmiş değeri kullanmıyor. Joi/Zod/manual kontroller aynı davranışı üretmiyor; ID ve sorgu sınırları sistematik doğrulanmıyor.

**Düzeltme/kabul:** Mevcut veritabanına uygun hata çevirisi, izinli hata kodları, ortak request/response şemaları ve doğrulanmış değerlerin controller'a aktarılması. Hatalı ID, geçersiz süre, mükerrer ad, FK ve beklenmeyen DB hatasında doğru 4xx/5xx ve iç detayların korunması doğrulanmalı.

### A20 — Kilitli kurulum ve güvenli kurulum yaşam döngüsü yok

**Dayanak:** `.gitignore:43`; kök package.json `setup`, `install:all`; `backend/scripts/database-setup.js:1`, `:12`; `backend/scripts/seed.js:166`; `backend/src/scripts/seed.ts`.

Lock dosyaları ignore ediliyor; `npm ci` tabanı yok. Root install zaten workspace kurarken ayrıca iki alt install çalıştırılıyor. setup derlenmiş dist gerektiren db script'ini build'den önce çağırıyor. database-setup modelleri yüklemiyor; aynı süreçte modeller yüklenmişse force:true yıkıcı olabilir. İki seed uygulamasından eski JS sürümü category string alanını kullanıyor; mevcut Course ise categoryId gerektiriyor. DB_PATH/FRONTEND_URL env örnekleri mevcut kodda uygulanmıyor.

**Düzeltme/kabul:** Tek paket yöneticisi/lock, sabit desteklenen runtime, idempotent tek seed ve migration komutu. Kurulum normal veri sıfırlamamalı. Temiz checkout ve mevcut verili checkout için kurulum ayrı ayrı denenmeli; ikinci çalıştırma veri değiştirmemeli/silmemeli.

### A21 — Kullanılmayan modüller, aşırı büyüyen bileşenler ve paket yükü

**Dayanak:** main.tsx'ten statik import erişilebilirlik taraması; `WeeklyPlanner.tsx` 1.404, `CreateSessionModal.tsx` 915, `DailyCalendar.tsx` 765 satır.

Erişilemeyen frontend modülleri: AdminScheduleManager, CourseManagementModal, AddTopicModal, EditTopicModal, GoalSettingModal, AdminCategoriesPage ve `pages/courses/CoursesPage.tsx` placeholder. Bu modüller yine tsc kapsamındadır; bazıları build'i bozuyor. Bunlar kullanılabilir feature olarak sayılmamalı. Kaynak/config import eşleşmesi olmayan doğrudan paket adayları: backend express-validator/winston, frontend tailwind-merge; kaldırmadan önce script ve araç kullanımı son kez doğrulanmalı.

Günlük/haftalık takvimler drag/resize, durum, mutation ve görünüm kurallarını tekrar ediyor. Sayfalar tek girişten eagerly yükleniyor; paketleme 1,37 MB JS üretti. Route splitting iddiası yanlış. Kaynak haritaları varsayılan açık; dağıtım politikası yok. Debug/silme script'leri ve MongoDB geliştirme prompt'u aktif kaynakla birlikte duruyor. users.txt içinde hesap bilgisi niteliğinde veriler bulunuyor; değerleri rapora kopyalanmadı, gerçek kullanım/geçerlilik doğrulanmadı.

**Düzeltme/kabul:** Kullanılmayan modülleri referans kontrolüyle kaldırma; tek planner işlem katmanı ve iki görünüm; tek timer motoru; feature bazlı dosya sınırları. Route lazy loading ve grafik yükünü ayırma sonrasında aynı koşullarda ilk yük JS ölçülmeli. Test kullanıcıları açık fixture olmalı; geçerli kimlik bilgisi tespit edilirse ayrıca yenilenmeli. Eski kod Git geçmişinden geri alınabilir; kaynakta alternatif olarak tutulmamalı.

### A22 — Mobil/erişilebilirlik ve hata deneyimi kanıtlanmamış

**Dayanak:** WeeklyPlanner/DailyCalendar native draggable ve mousemove/mouseup kullanımı; App.tsx/main.tsx; dashboard/layout sabit yükseklik ve overflow stilleri.

Takvim etkileşiminde dokunma ve klavye için eşdeğer sürükleme/resize yolu görünmüyor. Modal taşıma alternatifi var; bu bütün akışı erişilebilir yapmaya yetmez. İkon butonları, focus yönetimi ve hareket azaltma için bütünsel bir standardın kanıtı yok. Kök ErrorBoundary yok; bazı sorgu hataları boş/sıfır görünümle karışabiliyor. Lighthouse/WCAG/mobil başarı yüzdeleri ölçülmemiş.

**Düzeltme/kabul:** Pointer/klavye etkileşim sözleşmesi; erişilebilir adlar, focus, reduced-motion ve hata/boş/yükleniyor ayrımı. Gerçek mobil viewport, yalnız klavye, erişilebilirlik taraması ve ana akış E2E testi. Ölçümler alınmadan başarı skoru yazılmamalı.

## Bağımlılık güvenliği ve destek durumu

Repoda lock olmadığından audit için manifestlerin bağımsız backend/frontend kopyalarından geçici lock dosyaları üretildi. Doğrudan bağımlılıkların sürümleri workspace kurulumuyla karşılaştırıldı; fark yoktu. Transitive hoisting aynı kabul edilmedi. Sayılar bu yeniden çözümlemeye aittir; geçmiş/üretim dağıtımının envanteri değildir. Aynı advisory birden çok paket düğümüne yayılabilir; backend/frontend sayıları benzersiz açık toplamı olarak toplanamaz.

| Çözümleme | Toplam etkilenen paket düğümü | Critical | High | Moderate | Low |
|---|---:|---:|---:|---:|---:|
| Backend, tüm bağımlılıklar | 53 | 1 | 43 | 7 | 2 |
| Frontend, tüm bağımlılıklar | 19 | 0 | 13 | 6 | 0 |
| Backend, `--omit=dev` | 9 | 1 | 4 | 2 | 2 |
| Frontend, `--omit=dev` | 10 | 0 | 5 | 5 | 0 |

Backend critical düğüm `tar`; sqlite3/node-gyp kurulum zinciriyle ilişkili. Bu sonuç HTTP üzerinden doğrulanmış kritik saldırı anlamına gelmez. Frontend omit=dev listesinde Tailwind/plugin araçları da var; manifestte dependencies altında olmaları tarayıcı bundle'ında çalıştıklarını göstermez. Reachability ve tehdit modeli ayrı değerlendirilmeli. Doğrudan `npm audit fix --force` önerilmez; kırıcı yükseltme sonuçları test edilmelidir.

Resmî kaynaklarla kontrol edilen yaşam döngüsü:

- Manifest tabanı Node >=18; Node 18 EOL. Bu incelemede kullanılan Node 24 LTS hattı uygun geçiş adayıdır. [Node release takvimi](https://github.com/nodejs/Release).
- Vite 5 desteklenen hatlar dışında. Desteklenen kararlı hat ve React plugin'i birlikte güncellenmeli. [Vite releases](https://vite.dev/releases).
- ESLint 8 EOL. Güncel desteklenen hat, TypeScript parser/plugin ve flat config uyumluluğu birlikte ele alınmalı. [ESLint version support](https://eslint.org/version-support/).
- React 18 eski major; güncel React 19'a geçiş, Headless UI, dnd, chart ve animasyon uyumluluğuyla planlanmalı. [React versions](https://react.dev/versions).
- Recharts 2 kurulumda bakım uyarısı verdi; 3 geçiş rehberi mevcut. [Resmî migration rehberi](https://github.com/recharts/recharts/wiki/3.0-migration-guide).
- Express 4 için resmî destek sürüyor; sırf eski major diye EOL denmemeli. Express 5'e geçiş modernizasyon kararı olabilir, acil güvenlik düzeltmelerinin yerine geçmez. [Express support](https://expressjs.com/en/support/).

## Önerilen mimari yön

Mevcut monorepo ve modüler tek backend sürdürülebilir. İlk sorun mikroservis, Redis, event bus veya başka framework eksikliği değildir; iş kurallarının dağınıklığı ve doğrulama eksikliğidir.

1. **Sözleşmeler:** Auth, Preferences, Course ve StudySession için tek DTO/şema tanımı; backend runtime doğrulaması ve frontend tipleri aynı kaynaktan türetilmeli. Zod/Joi çoğaltması azaltılmalı; optional/null/ID/zaman/hata biçimleri netleştirilmeli. OpenAPI bu sözleşmeden üretilebilir.
2. **İş kuralları:** `auth`, `catalog`, `planning`, `study-tracking`, `settings`, `backup` modülleri. Controller HTTP'yi, service yetki ve iş kurallarını, veri katmanı atomik yazmayı üstlenmeli. Yalnız ihtiyaç duyulan sınırlar eklenmeli; her model için anlamsız generic repository üretilmemeli.
3. **Veri:** Plan ile gerçek çalışma kaydı ayrılmalı. Foreign key, unique/check kısıtları ve sorgu desenine uygun birleşik indeksler ölçüme göre eklenmeli. Tekil indeksler zaten var; “hiç indeks yok” doğru değildir. `(userId,startTime)` ve `(userId,status,startTime)` adayları query planıyla değerlendirilmelidir.
4. **Frontend:** Feature bazlı API/query keys/hooks; planner tek işlem motoru ve günlük/haftalık görünüm; tek timer motoru. Sunucu durumu Query'de, UI tercihleri Zustand'da; auth geçişinde bütün kişisel cache sınırı uygulanmalı.
5. **Görünüm:** Mevcut iOS/pastel yön tarihsel olarak korunabilir; ortak Button/Dialog/FormField ve tasarım token'ları oluşturulmalı. İş kuralları düzelmeden büyük görsel yeniden tasarım öncelik olmamalı.
6. **Operasyon:** Merkezi env doğrulaması, yapılandırılmış ve hassas alanları maskeleyen log, request ID, readiness/liveness, SIGTERM bağlantı boşaltma, gerçek restore testi. Çok instance ve yüksek eşzamanlı yazma hedeflenirse PostgreSQL kararının gerekçesi ve migration planı yazılmalı; SQLite'ın kendisi eskimiş teknoloji değildir.

## Kaldığımız yerden devam planı ve bitiş koşulları

### 1. Güvenilir geliştirme tabanı

- Tek runtime/paket yöneticisi ve izlenen lock; güncel desteklenen build/lint araçları.
- Frontend 50 hata giderilmeli; strict korunmalı. Kullanılmayan modüller referans kontrolüyle kaldırılmalı.
- CI: temiz kurulum → typecheck → lint → davranış testleri → build.
- **Çıkış ölçütü:** Yeni checkout'tan aynı sonuç; başarısız kontrollerin sessizce atlanmaması.

### 2. Güvenlik ve veri kaybını önleme

- A01–A07, A10 ve A13: yetki matrisi, fail-fast config, ilişkisel doğrulama, yan etkisiz GET, atomik zaman/silme işlemleri, çalışır yedek/kurtarma ve iptal edilebilir oturumlar.
- **Çıkış ölçütü:** İki kullanıcı izolasyonu, rollback ve ayrı geçici DB'de restore testleri geçmeli.

### 3. Ürün doğruluğu

- A08–A09, A11 ve A14–A19: çalışma durumu/süre modeli, tek Preferences sözleşmesi, auth/cache sınırı, ortak timer, timezone ve doğru aggregate metrikler.
- **Çıkış ölçütü:** Baştan sona kayıt → ders → plan → çalışma → pause/resume → tamamlama → doğru rapor → yeniden giriş akışı geçmeli.

### 4. Bakım, performans ve kullanım kalitesi

- Tekrarlı planner kodunu birleştirme; route/chart splitting; mobil ve klavye doğrulama; ölçülmüş performans bütçeleri; dağıtım ve izleme.
- **Çıkış ölçütü:** Ölçülmüş sonuç ve tekrar çalıştırılabilir test; “çalışıyor gibi görünüyor” yeterli değil.

AI, sosyal özellikler, PWA/offline, team collaboration ve gelişmiş analitik bu temel işler bitene kadar aktif geliştirme önceliği değildir. Eğitime özel içerik ile genel görev takibi arasındaki ürün yönü, yeni özellik başlamadan netleştirilmelidir; mevcut inceleme bu kararı kullanıcı adına değiştirmedi.

## Tekrar doğrulama notu

Bu rapordaki sorunlar inceleme tarihinde **açıktır**. Sonraki çalışmalar bulgu ID'sini, değişen davranışı ve geçen doğrulamayı progress/activeContext içinde güncellemeli; rapor tarihsel inceleme olarak korunmalıdır. Canlı UI, gerçek SQLite entegrasyonu, concurrency yükü, dışa açık deployment ve gerçek kullanıcı verisinin geçerliliği bu incelemenin kanıt sınırları dışındadır.
