# Ders Takip Sistemi — İlerleme

Son güncelleme: 17 Ekim 2026, A21 site ayarları/yedekleme alt paketi; yerel schema 006.

## Genel durum

İnceleme sonrası geliştirme başladı. Derleme ve kalite tabanı çalışır hale getirildi; kritik erişim/veri okuma sorunları ve tam kapsamlı site taramasında tespit edilen çalışma zamanı/UI/veri bütünlüğü hataları kapatıldı. Bütün audit bulguları çözülmüş veya üretime hazır kabul edilmez.

Kurallar: `workingPrinciples.md`. Başlangıç incelemesi: `audits/2026-10-15-project-audit.md`. Uygulama kaydı: `implementation/2026-10-15-foundation.md`.

## A21 — Site ayarları ve yedekleme (17 Ekim 2026)

Site ayarları ve yedekleme alt paketi tamamlandı. AdminSettingsPage nötr tasarım ve etiketli alanlar kullanır; pristine form yeni okumayı izler, düzenlenen taslak refetch/bölüm değişiminde korunur. Shared schema ile yalnız değişen alanlar kaydedilir; no-op yazmaz, hata taslağı korur. Private settings read/write revision + account generation geç yanıtı sınırlar. Public hata private hatayı ezmez.

BackupPanel hesaplı Query ile loading/error/retry/boş listeyi ayırır. Restore yalnız verified === true ise açılır; dirty taslakta restore/reset kapalıdır. Ayar/yedek/restore/reset tek busy/mount/epoch hook'u ve async ConfirmDialog kullanır; pending kapama/çift gönderim kilitlidir. Restore ack sonrası protected refetch öncesinde logout; reset ack sonrası account invalidation + private settings yeniden okuma vardır. Native confirm/gecikmeli reload kaldırıldı. Bildirim teslimatı/offsite/saklama altyapısı uygulanmış gibi gösterilmez.

npm run check: **10 contracts + 130 backend + 138 frontend = 278 test**, atlanan yok; naming/strict/lint/production build başarılı. Yeni 18 ekran testi frontend/tests/admin-settings.test.tsx, 4 store yarış/sınır regresyonu var. Son frontend strict/root lint tekrar geçti. Temp production fixture: taslak/bölüm/dirty kilit, verified/unverified liste, manuel backup create/refetch, restore Escape/odak ve settings_only iptal doğrulandı. Temp snapshot checksum/integrity ve hesap/site ayarı korunması kontrol edildi; kaydedilmemiş taslak DB'ye yazılmadı. Tarayıcı restore/reset final onayı verilmedi; gerçek servis davranışları mevcut temp SQLite testlerinde geçer. Fixture sekme/süreç/DB temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002 sağlıklı; log /tmp/study-tracker-user-management-dev.log. Detay: implementation/2026-10-17-admin-settings-and-backups.md.

**Sıradaki:** A21 diğer modal/admin (özellikle yönetim özeti) nötr yüzey/kullanılmayan yol son denetimi; ardından A19 auth/user update/backup/plan DTO ve Plan ürün anlamı. A22/A04 ve bağımlılık backlog'u açık.

## A21 — Kullanıcı yönetimi (17 Ekim 2026)

Kullanıcı yönetimi/oluşturma tamamlandı: nötr yüzeyler, 20 kayıt/sayfa ve sunucu toplamı, bütün kayıtlarda sunucu araması, stabil ikincil ID sıralaması, hata/boş/retry ayrımı ve son satır sonrası sayfa düzeltmesi. Rol/durum/silme onayları sunucu başarısını bekler; hata, pending, çift gönderim, öz-koruma ve hesap epoch sınırı uygulanır. Oluşturma istemci/admin POST ortak Zod 4 sözleşmesiyle doğrulanır; parola tekrarı gönderilmez, form yeniden açılınca eski kimlik bilgileri temizlenir. EditorDialog ve useAccountMutation katalog ile kullanıcı akışlarında ortaktır; eski CatalogEditorDialog kaldırıldı.

npm run check: **10 contracts + 130 backend + 116 frontend = 256 test**, atlanan yok; naming/strict/lint/production build başarılı. Yeni 13 frontend ekran testi frontend/tests/user-management.test.tsx, 5 temp HTTP/SQLite testi backend/tests/user-management.test.cjs, 2 sözleşme testi packages/contracts/tests/users.test.cjs içindedir. Production bundle ayrı atılabilir DB'de 102 kullanıcı/6 sayfa, ikinci sayfa, tüm katalog araması, silme onayı/iptal, oluşturma formu etiketleri ve Escape/odak dönüşüyle doğrulandı. Tarayıcıdan kalıcı silme/rol değişikliği/yeni parola kaydı yapılmadı; bunların davranışı otomatik test kapsamındadır. Fixture sekme/süreç/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002, log /tmp/study-tracker-user-management-dev.log. Detay: implementation/2026-10-17-user-management.md.

**A21 kalan:** AdminSettingsPage ayar/yedekleme taslak/refetch, dirty patch, backup GET hata/boş ayrımı ve restore/reset async onay/busy/error/epoch; verified === true kontrolü. Diğer kalan admin yüzeylerinin nötr tasarım incelemesi sürer. A19 kalan auth/user update/plan/backup DTO ve Plan sözleşmesi; A22/A04 açıktır.

## A21 — Kategori yönetimi ve test düzeni (17 Ekim 2026)

Kategori yönetimi alt paketi tamamlandı: nötr liste ve ortak CategoryEditorModal/CatalogEditorDialog; shared contracts doğrulaması, yalnız değişen alanların kaydı, hata/boş/retry ayrımı, pasif kategori görünürlüğü ve taslak koruması. Silme/taşıma onayı sunucu başarısını bekler; hedef açıkça seçilir, hata/pending/çift gönderim ve account epoch sınırı uygulanır. İç içe Dialog Escape/odak dönüşü testlidir. Eski inline form/ikon/mutation tekrarları kaldırıldı.

Yeni 13 ekran regresyonu frontend/tests/category-management.test.tsx içindedir; tests/ Vitest, strict TypeScript ve ESLint kapsamına alındı. Mevcut src testleri korunur; topluca taşıma veya kopyalama yapılmadı. npm run check: **8 contracts + 125 backend + 103 frontend = 236 test**, atlanan yok; naming/strict/lint/production build başarılı. Ayrı production fixture'da create/edit/pasiflik/Escape ve taşıma onayı/iptal kontrol edildi. Temp API ile 3 özel/ortak/pasif ders taşındı; konu/ilerleme/seans/not/300 saniyelik interval geçmişi birebir korundu, integrity/FK temiz. Tarayıcı reload yeni kategori adını gösterdi. Fixture sekme/süreç/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok. Tek root dev localhost:3000/API 5002, log /tmp/study-tracker-category-management-dev.log. Detay: implementation/2026-10-17-category-management.md.

**A21 kalan:** kullanıcı yönetimi/oluşturma ve ayar/yedekleme ekranlarının nötr tasarım, async onay, hata/taslak ve hesap sınırı tutarlılığı. Kategori ve öğrenci katalog UI/ortak planner tamamdır. A19/A22/A04 açık kalır.

## A21 — Öğrenci katalog düzenleme alt paketi (16 Ekim 2026)

Öğrencinin kendi özel ders/konusunu düzenleme ve ders silme/konu arşivleme arayüzü tamamlandı. Arşivden geri alma ve arşivde düzenleme eklendi. CourseEditorModal öğrenci/admin create/edit için tek uygulamadır; TopicEditorModal da create/edit'i birleştirir. Eski iki create modalı ve admin içindeki ikinci CourseModal kaldırıldı. Ortak dialog/ikon/yetki ve mutation sınırı vardır; shared contracts doğrulaması, değişen alanları gönderme, taslak/hata/pending koruması ve account epoch izolasyonu testlidir. Ders listesi/detayı ve admin ders yönetimi nötr tasarım sistemine taşındı. Restore sırasında aktif aynı ad çakışması transaction içinde 409 ile reddedilir; ilerleme/geçmiş korunur.

`npm run check`: **8 contracts + 125 backend + 90 frontend = 223 test**, atlanan yok; naming/strict/lint/production build başarılı. Son erişilebilir drag-handle adı eklemesinden sonra ilgili frontend typecheck/lint/5 component testi/build tekrar geçti. Production fixture'da öğrenci ders/konu edit, arşiv UI/geri alma/reload ve admin ortak ders create doğrulandı. Temp SQLite kontrolünde completed ilerleme, seans notları/bağlantıları ve 300 ölçülmüş saniye korundu; FK temiz. Tarayıcıdaki son kalıcı silme onayı iptal edildi; silme API/SQLite regresyonlarında testlidir. Fixture süreçleri/sekmesi/verisi temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 korunur. Tek root dev localhost:3000/API 5002 çalışır; log /tmp/study-tracker-shared-planner-dev.log. Commit/push/deployment yok. Detay: implementation/2026-10-16-catalog-editing.md.

**A21 kalan:** kategori/kullanıcı/ayar ve diğer modal/admin yüzeylerinde nötr tasarım tutarlılığı. Öğrenci katalog UI ve ortak planner tamamdır; A19/A22/A04 açık kalır.

## A21 — Ortak planlayıcı alt paketi (16 Ekim 2026)

A21'in planlayıcı alt paketi tamamlandı. WeeklyPlanner/DailyCalendar tek PlannerCalendar, usePlannerCalendar, CalendarSessionCard ve calendarGeometry kullanır; eski iki motor kaldırıldı. Drag/resize/tarih taşıma ve seans komutları aynı busy ref, sunucu onayı/sürüm ve auth epoch sınırındadır. 409 yazmayı otomatik tekrarlamaz; güncel kaynak okunur, açık hedef tarih korunur ve yeni kullanıcı onayı gerekir. Gerçek end-start süresi korunur, gece yarısında sessiz kırpma kaldırıldı; ortak CalendarDate dönüşümü artık milisaniyeyi korur. Async Confirm/Move dialog başarı bekler, hata/pending görünürdür.

npm run check: **8 contracts + 123 backend + 74 frontend = 205 test**, atlanan yok; naming/strict/lint/production build başarılı. Production fixture'da native drag 09:00→11:15, resize 60→90 dk, ertesi güne taşıma, günlük/haftalık/reload ve gerçek edit formu doğrulandı. Temp DB'de 3 planlanmış seans/notlar ve gece seansı korundu; ölçüm uydurulmadı. Fixture temizlendi. Gerçek DB'de migration/seed/reset/restore veya test verisi yazılmadı; yerel schema 006 korunur. Tek root dev localhost:3000/API 5002, log /tmp/study-tracker-shared-planner-dev.log. Commit/push/deployment yok. Detay: implementation/2026-10-16-shared-planner.md.

Bu planlayıcı paketi kapanışında öğrenci katalog UI ve kalan modal/admin tasarımı açıktı. Öğrenci katalog alt paketi yukarıdaki sonraki kayıtta tamamlandı; tarihsel 205 test sonucu korunur.

## Önceki kapanış ve yerel entegrasyon

Kullanıcı limit nedeniyle başka yapay zekâlarla A17/A18/A24 ve ek düzeltmeleri tamamladı; güncel progress ve kod esas alındı, bu paketler yeniden uygulanmadı. Yarım kalan A15 kapanışı (tarayıcı kanıtı/temizlik/bellek kaydı) tamamlandı. Bütün güncel kodla npm run check yeniden başarılı: **8 contracts + 123 backend + 53 frontend = 184 test**, atlanan yok; naming/strict/lint/production build geçti. Log /tmp/study-tracker-final-integration-check.log.

A24'ün açık kalan normal yerel 006 yükseltmesi de tamamlandı: dev süreçleri durduruldu; native özel snapshot checksum/integrity/FK ile doğrulandı (.local/topic-progress-upgrade-2026-10-16.json özel pointer, 0600). npm run db:migrate sonrası önceki 12 tablonun bütün satırları snapshot ile aynı bulundu; user_topic_progress boş, geçmiş durum türetilmedi. Güncel schema manuel backup id 6 alındı. Gerçek veride seed/reset/restore veya test fixture yazması yok. Tek root npm run dev localhost:3000/API 5002 üzerinde yeniden başlatıldı; log /tmp/study-tracker-final-integration-dev.log. Commit/push/deployment yok.

A17/A18/A24 için önceki kayıtların kanıt sınırı korunur; bu kapanışta onların yeni manuel tarayıcı doğrulaması yapılmadı. Sonraki açık işler progress listesindeki A21/A19/A22/A04'tür.

## Site ve kod tabanı denetimi / hata düzeltmeleri (16 Ekim 2026)

Kaldığımız yerden devam etmeden önce tüm sayfalar, bileşenler, API uç noktaları ve sözleşmeler tarandı; tespit edilen hatalar düzeltildi:

- **Geliştirme sunucusu (`backend/package.json`):** `tsx watch` komutuna `--clear-screen=false --exclude "../node_modules/**" --exclude "*.sqlite*" --exclude "backups/**"` eklendi; macOS üzerinde üst dizindeki `node_modules` ve SQLite WAL değişimlerinden kaynaklanan sürekli yeniden başlatma döngüsü giderildi.
- **Çalışma seansı ilişki temizleme ve arşivlenmiş ders/konu koruması (`packages/contracts/src/studySessions.ts`, `backend/src/models/StudySession.ts`, `backend/src/services/studySessions.ts`):** `updateSessionSchema` içinde `courseId`, `topicId` ve `planId` alanlarına `.nullable().optional()` desteği eklendi. Seans güncellenirken `null` gönderildiğinde ders/konu/plan bağının temizlenmesi, ders değiştiğinde eski konunun otomatik sıfırlanması ve geçmişte oluşturulmuş bir seansın bağlı olduğu ders/konu sonradan pasife alınsa bile seansın düzenlenebilmesi sağlandı.
- **Katalog aktif/pasif filtreleme, sıralama ve arşivlenmiş konu adı/sırası (`backend/src/controllers/courseController.ts`, `backend/src/controllers/topicController.ts`, `backend/src/services/catalog.ts`):** `getCourses`, `getCourseTopics` ve `getTopics` uç noktalarına `isActive=all` desteği eklendi; admin panelinde pasife alınan ders ve konuların kaybolması önlendi. `getCourses` ve `getCourse` içindeki `Topic` alt sorgularına `separate: true, order: [['order', 'ASC'], ['id', 'ASC']]` eklendi. `services/catalog.ts` içinde `assertTopicName`, `appendTopicOrder` ve `createTopic` sıra çakışması kontrolleri `isActive: true` konularla sınırlandırıldı; arşivlenmiş (`isActive: false`) konuların aynı adla yeni konu açılmasını engellemesi ve sıra numarası boşluğu yaratması düzeltildi.
- **Kullanıcı yönetimi, profil ve parola doğrulama (`backend/src/models/User.ts`, `backend/src/utils/validation.ts`, `backend/src/controllers/authController.ts`, `backend/src/controllers/userController.ts`, `frontend/src/pages/profile/ProfilePage.tsx`, `frontend/src/pages/settings/UserSettingsPage.tsx`, `frontend/src/pages/admin/AdminUsersPage.tsx`, `frontend/src/components/admin/CreateUserModal.tsx`):** `User.role` model doğrulaması eklendi. `updateProfileSchema` içinde base64 (`data:image/...`) profil fotoğrafları ve fotoğraf/alan temizleme (`null` / `''`) desteklendi. `ProfilePage` ve `UserSettingsPage` parola uzunluğu kuralları backend ile (en az 12 karakter, en fazla 72 UTF-8 bayt) eşitlendi ve store hidrasyon senkronu düzeltildi. `userController` içinde sayfalama/sıralama/rol parametreleri doğrulandı; `createUser` ve `deleteUser` işlemleri `IMMEDIATE` transaction içine alındı (kullanıcı silindiğinde özel derslerinin temizlenmesi, seans bağlantılarının koparılması ve oturumlarının iptali dahil); `getUserStudyStats` hedef kullanıcının saat dilimini kullanacak şekilde düzeltildi; admin kullanıcının kendi hesabını pasife alması, silmesi veya öğrenciye düşürmesi hem API hem UI (`AdminUsersPage`) tarafında engellendi.
- **Katalog önbellek anahtarı ve kategori silme/taşıma UI (`frontend/src/components/modals/CourseCreateModal.tsx`, `frontend/src/components/modals/CategoryManagementModal.tsx`, `frontend/src/components/common/ConfirmDialog.tsx`, `frontend/src/pages/CoursesPage.tsx`, `frontend/src/pages/admin/AdminCoursesPage.tsx`, `frontend/src/pages/CourseDetailPage.tsx`):** `accountKeys.catalog('categories')` önbellek anahtarının farklı bileşenlerde farklı veri tipleriyle (`AxiosResponse` vs `Category[]`) ezilmesi sonucu oluşan çökme düzeltildi. Öğrenci `CoursesPage` ekranındaki yetkisiz `"Kategoriler"` düğmesi yalnız adminlere sınırlandı; `AdminCoursesPage` ekranına `"Kategoriler"` yönetim modalı, dersleri başka kategoriye taşıyarak silme (`migrateToCategoryId`) seçicisi, `isActive: 'all'` sorgusu ve dinamik ders ikonları eklendi. `CourseDetailPage` üzerinde `userId` karşılaştırması sayısal olarak normalize edildi.
- **Planlayıcı ve gösterge paneli etkileşim düzeltmeleri (`frontend/src/components/planner/CreateSessionModal.tsx`, `WeeklyPlanner.tsx`, `DailyCalendar.tsx`, `GoalsOverview.tsx`, `MoveSessionModal.tsx`, `frontend/src/components/dashboard/RecentActivities.tsx`):** `CreateSessionModal` içinde `"Mola"` (`break`) kategorisi seçildiğinde form geçerliliğinin güncellenmemesi (`shouldValidate: true`), moladan çıkınca `sessionType` değerinin `'study'`'ye dönmemesi ve ders seansını molaya/özel seansa çevirirken `courseId: null, topicId: null` gönderilmemesi düzeltildi. `WeeklyPlanner` üzerinde boyutlandırma önizleme süresinin piksel yüksekliği (`48`) üzerinden yanlış hesaplanması düzeltildi ve seans kartına tıklandığında düzenleme modalının açılması sağlandı. `DailyCalendar` sağ tık menüsüne dışarı tıklama/Escape ile kapanma ve boyutlandırma sırasında canlı süre rozeti eklendi; `PomodoroModal` kapandığında küçültülmüş durum sıfırlandı. `GoalsOverview` içinde duraklatılmış seanslar için `canStartSession` kontrolü ve saat dilimi uyumlu `viewNow()` varsayılan tarihi eklendi. `MoveSessionModal` tarih senkronu ve erişilebilirlik etiketleri ile `RecentActivities` hata durumu gösterimi tamamlandı.

## A24 — Kalıcı kullanıcı-konu ilerlemesi (16 Ekim 2026)

Yeni `user_topic_progress` tablosu (`UserTopicProgress`, PK userId+topicId, FK CASCADE, durum yalnız `in_progress`/`completed`; satır yoksa `not_started`) ve explicit `006-user-topic-progress` migration'ı eklendi. `GET /api/topics/progress` kullanıcının kendi durumlarını (aktif ve görünür konular için), `PUT /api/topics/:id/progress` `{status}` ile tek konunun durumunu yazar; `not_started` satırı siler. İşlem `services/topicProgress.ts` içinde IMMEDIATE transaction'dadır; görünmeyen/arşivli konu 404, geçersiz durum veya fazla alan 400. Durum global kataloğa yazılmaz, kullanıcılar arası ayrıdır; konu/kullanıcı silinince satırlar temizlenir. `CourseDetailPage` durum düğmelerini sunucuya bağlar (kaydederken devre dışı, hatada toast, sonra yeniden okuma); component belleğindeki `topicStatuses` kaldırıldı. Ortak şema/tipler contracts'tadır.

Düzeltme: önceki not `CoursesPage`'in `studySeconds > 0` buluşsalıyla tamamlanan konu hesapladığını söylüyordu; kodda böyle bir hesap yoktu (`CoursesPage` ilerleme göstermiyor), yalnız `CourseDetailPage` yerel durum kullanıyordu. Ders listesinde ilerleme göstermek yeni ürün kararıdır, eklenmedi.

`npm run check`: **8 contracts + 123 backend + 53 frontend = 184 test**, strict/lint/naming/build başarılı; yeni `topic-progress.test.cjs` kullanıcı ayrımı, görünürlük, silme/arşiv ve cascade'i, yeni component testi sunucu durumunu ve kaydı doğrular. İlk paket sonunda gerçek DB'ye uygulanmayan 006, bu kapanışta native özel snapshot ve bütün eski satırların korunma karşılaştırmasıyla uygulandı; güncel schema yedeği id 6. Tarayıcıda elle doğrulama yapılmadı.

## A18 — Sistem ayarlarının çalışma zamanı (16 Ekim 2026)

- `allowRegistration` kapalıyken `POST /api/auth/register` 403 döner; `RegisterPage` "Kayıtlar kapalı" ekranı gösterir, `LoginPage` kayıt bağlantısını gizler.
- `maintenanceMode` açıkken admin olmayan kullanıcılar `protect` içinde 503 (`Retry-After`) alır; login ve register da 503'tür, admin girişi/erişimi açıktır. Önyüzde `Layout` admin olmayanlara bakım ekranı ve çıkış düğmesi gösterir. Bu iki bayrak artık public ayar DTO'sundadır (`publicSettingsSchema`); diğer private alanlar public değildir.
- `sessionTimeout` boşta kalma süresidir: `rotateAuthSession` son refresh kimliğinin yaşını `max(sessionTimeout, erişim anahtarı ömrü)` ile karşılaştırır, aşılırsa oturumu iptal eder. Refresh tembel (401 sonrası) olduğu için etkin alt sınır 15 dakikadır. Mutlak `SESSION_TTL_DAYS` sınırı değişmedi. Admin ayarlarında alan eklendi.
- `maxStudentsPerCourse` kaldırıldı: derse kayıt/öğrenci üyeliği modeli yok, ayar hiçbir yere bağlanamazdı. Eski saklı satır `readSiteSettings` izinli anahtar listesi dışında olduğundan yok sayılır. Bildirim ayarları (`emailNotifications`/`pushNotifications`) hâlâ yalnız saklanır; teslimat altyapısı yok, ürün kararı gerekir.
- `services/siteSettings.ts` (`readSiteSettings`, `sendMaintenance`) ayar okumanın tek kaynağıdır; `settingsController` onu kullanır. Her korunan istekte ayar tablosu bir kez okunur (ölçüm yapılmadı).

`npm run check`: **8 contracts + 120 backend + 52 frontend = 180 test**, strict/lint/naming/build başarılı. Yeni `backend/tests/runtime-settings.test.cjs` kayıt, bakım ve boşta kalma süresini doğrular. Önyüz ekranları (bakım/kayıt kapalı) tarayıcıda elle doğrulanmadı ve bileşen testi yok. Migration/dependency yok; gerçek DB'de ayar yazılmadı.

## A17 — Admin istatistikleri (16 Ekim 2026)

`GET /api/users/admin-stats` (yalnız admin) kullanıcı/ders sayıları, tüm kullanıcıların ölçülen toplam çalışma/seans/tamamlanan değerleri ve son 5 seansı (kullanıcı adıyla) döner; `AdminDashboardPage` artık yalnız admin'in kendi seanslarına/ilk sayfa kullanıcılara bakmaz. `GET /api/users?includeStats=true` her kullanıcıya `stats` ekler; `AdminUsersPage` N+1 `getUserStats` isteklerini bırakıp bu tek sorguyu kullanır. İki yol `services/studyTracking.ts` içindeki tek sorgulu `getAllTimeSummaries` ve mevcut `measuredTotals` kuralını paylaşır; ortak tipler `UserStudySummary`/`AdminOverview` contracts'tadır. Frontend'deki kullanılmayan `getUserStats` kaldırıldı; `/users/:id/stats` self/admin endpoint'i korunur. Şema/migration değişmedi. `npm run check`: **8 contracts + 117 backend + 52 frontend = 177 test**, strict/lint/naming/build başarılı; yeni backend testi admin yetkisi, toplamlar ve toplu özetleri doğrular. Tarayıcıda elle doğrulama ve yük ölçümü yapılmadı; her iki yol tüm seansları belleğe alır. Gerçek DB'de seed/reset/restore/migration yok.

## Kalıcı Pomodoro

A15 uygulandı: Pomodoro sayfası ve planlayıcı modalı tek usePomodoro/PomodoroTimer kullanır. Faz, döngü, milisaniye kalan süre ve mutlak deadline 005-pomodoro-clocks tablosunda saklanır; tarayıcı callback sayısı süre değildir. Sunucu scheduler'ı fazı kalıcı deadline'da ilerletir. Otomatik mola açıkça seçilir; mola sonunda çalışma kendiliğinden başlamaz. Reload/modal kapatma/rota değişimi sayacı durdurmaz. Eski kayıtta bilinmeyen faz uydurulmaz; kullanıcı sayacı açıkça etkinleştirir.

Komutlar expectedUpdatedAt + ortak IMMEDIATE seans transaction'ıyla yürür; genel planner eylemleri aynı kurala bağlıdır. Gecikmiş worker öncesi GET/stats açık çalışma/mola süresini deadline'da sınırlar ve yazmaz. Reset kullanıcı notunu veya ölçüm geçmişini silmez. Scheduler bakım/restore kapısında durur, yürüyen iş boşaltılır. Hesap anahtarında numeric/string ID normalizasyonu, sürüm/epoch koruması ve yalnız hesap kimliği taşıyan sekme invalidation bildirimi var.

Gerçek yerel 005 yükseltmesi native özel snapshot, eski bütün tablo satırlarının korunma karşılaştırması ve güncel schema manuel backup id 5 ile tamamlandı; seed/reset/restore yok. Tek root dev localhost:3000/API 5002 çalışır. Test/production fixture kanıtı ve sınırlar: implementation/2026-10-16-pomodoro-continuity.md.

## Katalog bütünlüğü

A10 kalan kapsam uygulandı: bütün kategori/ders/konu HTTP yazmaları services/catalog.ts içinde IMMEDIATE transaction kullanır. Ders silmede aktif/pasif konular cascade silinir, seans bağlantıları ve optimistic sürümleri aynı transaction'da güncellenir; seans/not/ölçülen geçmiş korunur. Kategori taşıma ve silme atomik; hedef kendisi/yok/dolu kategori ve görünür ad çakışması denetlenir. Konu silme arşivdir. Reorder bütün aktif liste + expectedTopics sürümü ve 1..N permütasyonu ister; eski/eşzamanlı liste 409, hatalı payload 400. Genel metadata yazmaları last-writer-wins kalır.

Frontend filtreli/azalan/alternatif sıralamada veya pending/refetch sırasında drag açmaz; sunucu onayından önce sıra değiştirmez, hatada liste yenilenir. Katalog yazması ilgili catalog/session cache'lerini yeniler. Konu formunun aynı key'e farklı biçim yazan ikinci sorgusu ve sıra tahmini kaldırıldı. Ortak katalog Zod/tip sözleşmesi eklendi. Schema/dependency migration gerekmiyor.

npm run check: **8 contracts + 99 backend + 44 frontend = 151 test**, atlanan yok; strict/lint/naming/production build başarılı. Production fixture'da klavyeyle sıralama/reload ve konu ekleme; geçici DB'de servis silmesi sonrası 0 ders/0 konu/1 seans/5 dk geçmiş UI'sı doğrulandı. Gerçek DB'de test yazması/seed/reset/restore/migration yok; tek root dev localhost:3000/API 5002 yeniden başlatıldı. Ayrıntı ve sınırlar: implementation/2026-10-16-catalog-integrity.md.

Yeni A24 statik bulgu: CourseDetailPage konu ilerleme düğmeleri yalnız component belleğine yazar, reload ile sıfırlanır. Kalıcı kullanıcı-konu ilerlemesi ayrıca ele alınmalı; global kataloğa kullanıcı ilerlemesi yazılmamalı.

## Gerçek süre ve saat dilimi

A09/A16 uygulandı: plan süresi korunur; SessionInterval çalışma/mola/duraklama aralıkları aynı transaction'da yazılır. 004 eski kayıtları untracked bırakır; ölçüm başlarsa partial, yeni seans complete'dir. Eski plan süreleri ölçülmüş çalışma sayılmaz. Yeniden açma/iptal geçmişi silmez, GET asOf ile salt okunur hesaplar. Pomodoro fazları çalışma/mola ayrımı gönderir; deadline motoru sonraki A15 paketiyle tamamlandı.

Ortak Luxon/IANA sözleşmesi: strict yerel gün, [başlangıç,bitiş) UTC sınırları, gerçek sürenin günlere bölünmesi, 23/25 saat ve belirsiz wall-time reddi. Form ve günlük/haftalık takvim sentetik CalendarDate ile browser timezone'undan bağımsızdır; API'ye gerçek instant dönüşümü zorunlu. Geceyi kesen kart her güne kırpılır. Dashboard/grafik/plan ve aktiviteler measured süre kullanır. Admin kullanıcı satırı gerçek kullanıcıya ait self/admin stats endpoint'inden gelir; global admin dashboard hâlâ açık.

Temiz npm ci ve **125 test (8 contracts / 78 backend / 39 frontend)**, strict typecheck, sıfır uyarılı lint, adlandırma ve production build başarılı. Production fixture: 10 dakika/eski ölçülmemiş süre ayrımı, 18:30 İstanbul formunun 15:30 UTC saklanması ve 18:30 görünümü, 1 dakikalık çalışma → duraklama → mola → complete. Gerçek yerel 004 yükseltmesi private native snapshot + eski bütün satır karşılaştırması + yeni schema yedeği id 4 ile tamamlandı; seed/reset/restore yok. Detay: implementation/2026-10-16-study-time-and-timezones.md.

## Atomik seans ve durum bütünlüğü

A07/A08 uygulandı: create/move/resize/yeniden etkinleştirme aynı IMMEDIATE transaction ve [start,end) kontrolünde; çakışma 409. Bütün HTTP yazmaları ortak service içindedir. Ortak durum tablosu, tek aktif seans, completedAt/idempotent no-op ve zorunlu expectedUpdatedAt eski yazma koruması var. Paused/completed aralığı korur, cancelled serbest bırakır. Tarihsel hatalı kayıtlar topluca değiştirilmedi; şema değişmedi.

Frontend bütün mutation'larda görülen snapshot sürümünü taşır; 409 ilgili session cache'lerini yeniler. Pomodoro yanıtları güncel snapshot olur, ana pause düğmesi sunucuda da duraklatır. Süre bittiğinde GET'in otomatik iptal edeceğini varsayan polling kaldırıldı. Bu paket kapanışında A09/A15/A16 açıktı; sonraki gerçek süre paketinde A09/A16 ele alındı. A15 deadline/tek motor sonraki pakette tamamlandı.

Son npm run check: **108 test (5 contracts / 67 backend / 36 frontend)**, strict typecheck, sıfır uyarılı lint, adlandırma ve production build'ler başarılı. Gerçek HTTP/SQLite yarışları, rollback, sürüm/durum/ilişki matrisi ve UI transport/component regresyonları var. Atılabilir production tarayıcı fixture'ında ikinci aktif seans reddi, gerçek pause/resume/complete doğrulandı. Ayrıntı: implementation/2026-10-16-session-integrity.md. Gerçek DB'de migration/seed/reset/restore yok.

## Tercihler, hesap sınırları ve site kimliği

Admin paneli kontrol edildi; /admin/settings genel ayarlarındaki ad/açıklama/logo/ikon ortak Brand, auth ekranları, sidebar/loading ve title/meta/favicon'a bağlandı. Görünen ürün adı teknik repo/paket adından bağımsızdır. Gerçek site adı değiştirilmedi; yeni isim yalnız fixture'da denendi.

Ortak contracts workspace ve Preferences v1; explicit 003 migration/arşiv; server-confirmed sıralı kayıt, hata/pending ve hesap sınırı; hesaplı okundu bildirimleri ve kişisel Pomodoro varsayılanı uygulandı. Query factory tüm kaynakları kullanıcıya; günlük/haftalık session görünümlerini tarih/timezone'a bağlar. Mutation invalidation bütün ilgili özetlere gider. Public/private ayarlar ayrıldı; yazmalar şemalı/transaction'lıdır.

Temiz npm ci ve 86 test/typecheck/lint/build başarılı. Fixture tarayıcı kontrolü; gerçek yerel DB'de önce private snapshot, sonra normal migration 003, kimlik/hash/oturum/kayıt korunma kontrolü ve yeni schema backup id 3 tamamlandı. Reset/restore/seed yapılmadı. Detay: implementation/2026-10-16-preferences-and-site-identity.md.

## Önceki oturum ve kurtarma paketi

İptal edilebilir session/refresh rotasyonu, cookie/CSRF, frontend ortak refresh ve geç yanıt/çevrimdışı logout izolasyonu tamamlandı. Admin oluşturma/kurtarma CLI eklendi. Native SQLite snapshot/restore, manifest/checksum/şema kontrolü, güvenlik snapshot'ı/rollback ve transaction'lı reset uygulandı. Otomatik yedek aralığı her kontrolde okunur ve geçen tam güne göre işler.

Kullanıcı ilk kurulum istedi: yeni ortam/DB ve admin@example.com hesabı oluşturuldu; özel parola dosyası `.local/admin-password.txt` (0600, Git dışında). Gerçek yerel DB'de giriş/reload/manual backup doğrulandı; reset/restore/seed yapılmadı. Tek dev süreci localhost:3000/API 5002'de bırakıldı. Uygulama ve geçiş sınırları `implementation/2026-10-15-security-and-recovery.md` içindedir.

## Tasarım paketi

Güncel resmî Geist/Linear örnekleri incelendi; sade nötr ürün dili uygulandı. Ortak kabuk/kontroller ve ana kullanıcı ekranları yenilendi; eski pastel/cam/gradyan yönü geçersiz. Kalıcı kararlar, kapsam ve doğrulama `design-system.md` içinde.

Son aktivitelerin zaman sırası, dashboard konu verisi/sayıları, query response uyumu ve günlük özetin cache mutasyonu da düzeltildi. Gerçek çalışma süresi ve admin istatistikleri açık; Preferences senkronu sonraki 16 Ekim paketinde düzeltildi.

## Doğrulananlar

| Kontrol | Güncel durum |
|---|---|
| Temiz npm ci | Başarılı, kök lock ile |
| İngilizce/ASCII teknik adlandırma | Kural kaydedildi; otomatik ASCII kontrolü geçti, anlam incelemesi ayrı |
| Backend/frontend typecheck | Başarılı, strict korunuyor |
| Lint | ESLint 10 flat config, sıfır uyarı |
| Ortak sözleşme test | 10 test; managed-user create kuralları dahil; timezone/DST ve Preferences, ayar şemaları ve seans geçiş/yazma sözleşmeleri |
| Backend test | 130 test; kullanıcı sayfalama/arama/create ve öz-koruma dahil; restore ad çakışması/yarışı ve geçmiş koruma dahil; admin agregasyonları/runtime ayarları/kullanıcı-konu ilerlemesi dahil; Pomodoro deadline/faz/yarış/migration/bakım regresyonları, arşivlenmiş ders/konu ilişkisi koruma ve ilişki temizleme (`null`), katalog `isActive=all` ve arşivlenmiş konu adı yeniden kullanımı, admin kendi hesabını koruma ve base64/null profil fotoğrafı regresyonları dahil |
| Frontend test | 138 test; ayar taslağı/patch/private read yarışları ve backup async/epoch/kurtarma sınırları dahil; kullanıcı yönetimi/oluşturma, sunucu onayı ve hesap sınırları dahil; kategori yönetimi/hata/retry/hedef seçimi ve nested dialog/epoch dahil; ortak katalog create/edit, yetki/dirty patch/pending/epoch ve arşiv/restore regresyonları dahil; ortak drag/resize/409/retry/epoch ve async dialog regresyonları dahil; sunucuya bağlı konu ilerlemesi dahil; ortak timer, gecikmiş callback/yanıt, hesap ayrımı, iki planner erişim ve haftalık takvim kartından düzenleme modalı açma regresyonları dahil; katalog transport/cache ve sıralama component regresyonları dahil; takvim alanları/gece yarısı/Pomodoro fazı ve sürümlü seans transport ve iki Pomodoro yüzeyinin sunucu onayı, auth/cache/çevrimdışı logout, tercih/kayıt/kullanıcı/tarih/bildirim/branding, gerçek HTTP refresh, hata sınırı ve sıralama |
| Backend/frontend production build | Başarılı, Vite 8 |
| Production bundle tarayıcı smoke | Dolu geçici veride giriş/dashboard/dersler, planner/özet, arama, mobil özel seans oluşturma; açık/koyu görünüm |
| GitHub CI | Workflow eklendi; uzak koşum yapılmadı |
| Yerel ilk kurulum | Açık kullanıcı yetkisiyle configure/migration/admin oluşturma; giriş/reload/manual snapshot başarılı; reset/restore/seed yok |
| Mobil manuel kontrol | 390×844; günlük görünüm, menü, Escape/odak, arama ve form; yatay sayfa taşması yok |
| Otomatik tarayıcı E2E / tam WCAG / Lighthouse / yük | Henüz yok |

## Audit durumları

| Bulgu | Durum / kanıt sınırı |
|---|---|
| A01 | Ders/konu/kullanıcı okuma kapsamı düzeltildi; owner/other/admin HTTP matrisi var. |
| A02 | Sabit secret fallback kaldırıldı; env doğrulama ve güvenli development seed eklendi. Gerçek dağıtım anahtarı/oturum yenilemesi yapılmadı. |
| A03 | Tek DB yolu uygulandı; snapshot'ın aynı geçici DB'deki kayıtları içerdiği doğrulandı. |
| A04 | Tek süreç kapsamında native WAL snapshot/atomik restore, manifest/checksum/şema kontrolü, safety/rollback, bakım kapısı ve geçen gün planı testli. Offsite/kapasite/retention ve gerçek ortam kurtarma tatbikatı açık. |
| A05 | GET durum/not değiştirmiyor; tekrar okuma regresyonu var. Zaman aşımı ürün politikası ayrı iş. |
| A06 | Yeni oturumların ders/konu yetkisi, eşleşmesi ve aktifliği doğrulanıyor; mevcut oturumda sonradan pasife alınan ders/konu bağı düzenlemede korunuyor ve `null` ile temizlenebiliyor. Tarihsel hatalı ilişkiler gerçek DB'de taranmadı. |
| A07/A08 | Uygulandı/testli: IMMEDIATE create/move/resize/yeniden etkinleştirme; ortak durum politikası, tek aktif seans, stabil completedAt, zorunlu optimistic sürüm ve stale 409. Tarihsel çakışmalar/harici SQL ayrı kapsamdır. |
| A09 | Uygulandı/testli: ayrı ölçülen aralıklar, study/break/pause, kayıpsız 004/coverage, gerçek süre özetleri; 5+3+5 dakika ve rollback. İnsan varlığı/offline geriye dönük ölçüm iddiası yok. |
| A10 | Uygulandı/testli: reset safety/transaction ve ortak IMMEDIATE catalog servisi; atomik kategori taşıma/silme (+ `AdminCoursesPage` üzerinde kategori taşıma/silme UI'ı), FK/sürüm ile geçmişi koruyan ders silme, soft topic delete, arşivlenmiş konu adını yeniden kullanabilme, `isActive=all` listeleme ve sürümlü tam reorder. Hata enjeksiyonu ve eşzamanlı HTTP/SQLite regresyonları var; harici SQL domain kapsamı dışındadır. |
| A11 | Uygulandı/testli: ortak v1 sözleşme, explicit legacy JSON migration/arşiv, tam round-trip, sıralı ve sunucu onaylı kayıt, hata ve hesap sınırı. Dil/bildirim/süre tercihi saklamak ilgili ürün altyapısının tamamlandığı anlamına gelmez. |
| A12 | Yerel check zinciri çalışıyor; 278 test ve CI workflow var. Uzak CI ve kapsamlı E2E henüz yok. |
| A13 | Uygulandı/testli: DB session, hash'li refresh rotasyonu/replay iptali, cookie/CSRF, logout/parola/rol iptali, ortak refresh ve geç yanıt izolasyonu. Production cookie dağıtımı ayrıca doğrulanmalı. |
| A14 | Tanımlı kapsam uygulandı/testli: ortak account/resource/date/timezone key factory, kategori önbellek şekli uyumu, ilgili özetlere invalidation, gün anahtarı yenileme, memory-only tercihler, hesaplı bildirim geçmişi, profil/admin geç yanıt sınırı. Backend timezone doğruluğu sonraki A16 paketiyle tamamlandı. |
| A15 | Uygulandı/testli: kalıcı sunucu deadline/faz/döngü, ortak timer hook/UI, reload/modal/çoklu sekme, sürüm/epoch koruması; gecikmiş worker ölçümü deadline ile sınırlı. Otomatik mola opt-in; otomatik çalışma yok. Yük/çok süreç operasyonu ayrıca doğrulanmalı. |
| A16 | Uygulandı/testli: ortak timezone sınırı/form/takvim, kesişimli okuma ve günlük gerçek süre; UTC/İstanbul/New York ve DST 23/25 saat. Grid tekrarlanan saat için ayrı satır üretmez; kapsamlı DST pointer/E2E A22 altında açık. |
| A17 | Uygulandı/testli: global admin özet endpoint'i ve dashboard, `includeStats` ile toplu kullanıcı istatistikleri (N+1 kalktı), all-time ölçülen süre. Büyük veri performansı ölçülmedi. |
| A18 | Uygulandı/testli (API); UI elle doğrulanmadı: allowRegistration, maintenanceMode (admin hariç 503), sessionTimeout (boşta süresi, alt sınır 15 dk). maxStudentsPerCourse kaldırıldı (model yok). **Açık:** bildirim teslimatı yok, ürün kararı gerekir. |
| A19 | Kısmen: MongoDB hata kalıntıları kaldırıldı, Sequelize 400/409 dönüşümü, admin kullanıcı oluşturma ortak Zod 4 sözleşmesi ve kullanıcı yönetimi (`userController`) parametre/transaction/öz-koruma doğrulamaları ve profil/parola kuralları düzeltildi. **Eksikler:** `planController`, `userController`, `authController` ve `backupController` doğrulamalarının ortak `@study-tracker/contracts` Zod şemalarına taşınması ve `Plan` (`/api/plans`) modeli ile `StudySession` tabanlı Planner UI arasındaki sözleşme kopukluğunun giderilmesi açık. |
| A20 | Lock, modern dev araçları, güvenli setup, üç workspace ve açık 001–006 migration var. Legacy şema evrimleri için sonraki explicit migration'lar gerekiyor. |
| A21 | Kısmen: yedi ölü modül/eski script/paket kaldırıldı; route splitting tamam; iki timer motoru ortaklaştırıldı; `WeeklyPlanner` ve `DailyCalendar` etkileşim hataları düzeltildi. PlannerCalendar/usePlannerCalendar/kart/geometry ile iki takvim motoru birleştirildi; drag/resize/409/epoch ve async dialog testli. Öğrenci özel ders/konu edit/delete/archive/restore UI, tek öğrenci/admin ders editörü ve nötr ders yüzeyleri tamam. Kategori ve kullanıcı yönetimi/shared editor ve async onaylar da tamamlandı. Ayar/yedekleme taslak/dirty patch/read error/async onay/epoch da tamam. **Eksikler:** diğer modal/admin (özellikle yönetim özeti) nötr tasarım/kullanılmayan yol son denetimi. |
| A22 | Kısmen: ErrorBoundary, mobil Dialog odak/Escape, `MoveSessionModal` klavye/etiket erişilebilirliği, skip link, reduced-motion ve 390 px manuel kontrolü var. **Eksikler:** Takvim sürükle-bırak ve boyutlandırma için klavye/dokunmatik alternatifleri, tam WCAG, Lighthouse ve otomatik Playwright E2E tamamlanmadı. |
| A23 | Yeni kullanıcı gereksinimi uygulandı: bütün görünen site adı/admin kimlik ayarları ortak kaynaktan değişir; repo/domain değiştirmez. |
| A24 | Uygulandı/testli: 006 migration, kullanıcıya özel `user_topic_progress`, GET/PUT uç noktaları, `CourseDetailPage` sunucu bağlantısı. Yerel 006 özel snapshot/veri koruma kontrolü ve schema backup id 6 ile uygulandı. Tarayıcı elle doğrulaması ayrıca açık. |

## Bağımlılıklar

Ortak timezone/takvim hesabı Luxon 3.7.2 kullanır; tipler 3.7.6. Ortak contracts workspace Zod 4 kullanır; diğer frontend formları Zod 3/RHF üzerinde kalır. Kök dev/build/check sözleşmeleri derler; Vite linked workspace için ayrı major bağımlılığını optimize eder.

Node 24.21.0, npm 11.19.0; Vite 8.3.4, plugin-react 6.1.2, ESLint 10.12.0, typescript-eslint 8.71.2, Vitest 5.0.4, sqlite3 6.0.1, tsx 4.23.15. TypeScript 5.9.3 sabit; React 18/Recharts 2/Router 6/Tailwind 3 dönüşümleri tamamlanmadı.

İlk mühendislik paketinde lock audit sonucu: 12 paket düğümü (0 critical / 5 high / 7 moderate). Başlangıçta bağımsız manifest çözümlemeleri kullanıldığından eski sayılarla doğrudan yüzde karşılaştırması yapılmaz. Aynı advisory birden fazla düğümü etkileyebilir. Bunlar açık iş olarak tutulur.

## Eksik ve tamamlanacak işler (Kaldığımız yerden devam listesi)

1. **A21 — Kalan Modal/Admin Tasarım Tutarlılığı:**
   - Planner ortaklaştırması tamamlandı/testli; ikinci işlem motoru açılmamalı.
   - Öğrenci özel ders/konu düzenleme-silme/arşiv/geri alma ve ortak öğrenci/admin ders editörü tamamlandı; yeniden uygulanmayacak.
   - Kategori yönetimi tamamlandı; yeni ekran testleri frontend/tests altında kalite zincirine bağlı.
   - Kullanıcı yönetimi/oluşturma, sunucu sayfalaması/araması ve async onaylar tamamlandı; yeniden uygulanmayacak.
   - Site ayarları/yedekleme taslak/dirty patch/read error/async onay/epoch ve verified === true tamamlandı.
   - Sırada diğer modal/admin (özellikle yönetim özeti) nötr yüzey/kullanılmayan yol son denetimi.
2. **A19 — Kalan Sözleşme/DTO Birleştirmesi ve Plan Modeli:**
   - `userController`, `authController`, `planController` ve `backupController` doğrulamaları `@study-tracker/contracts` altına taşınacak; `/api/plans` uç noktalarının ürün içindeki yeri netleştirilecek.
3. **A22 & A04 — Klavye/Dokunmatik Takvim, Otomatik E2E, Kurtarma ve Bağımlılıklar:**
   - Takvim etkileşimleri için klavye/dokunmatik desteği, Playwright E2E testleri, yedek saklama/offsite politikası ve kalan major bağımlılık güncellemeleri tamamlanacak.

Her iş ilgili davranış testi, gerekli kontroller ve memory-bank güncellemesiyle kapanır. İnceleme raporu tarihsel kalır; güncel durum bu dosyadan izlenir.
