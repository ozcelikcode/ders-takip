# A19 — Shared request contracts and plan boundaries

17 Ekim 2026. Kullanıcı açıkça A19'a devam istedi. Memory-bank ve mevcut kaynak incelendi; önceki A21 değişiklikleri çalışma ağacında korundu. Şema/veri dönüşümü, seed/reset/restore, gerçek hesap/parola değişimi, commit/push/deployment yapılmadı.

## Bulgular ve uygulama

- Auth Joi middleware'i normalize edilmiş değeri kullanmıyordu. Auth/profile ve admin create ayrı kurallara bağlıydı; admin update ortak şemadan geçmiyordu. Ortak Zod 4 register/login/changePassword/profilePatch/managedUserPatch ve kullanıcı liste query şemaları eklendi. Normalize edilmiş body/query/params controller'a aktarılır; şemada belirtilmeyen bölümler silinmez. Middleware'deki any/cast edilmiş Zod parse sonucu kaldırıldı; Express query tipinin sayısal parse çıktısıyla adaptasyonu tek sınırda kalır.
- Public register rol/aktiflik/tercih alanlarını kabul etmez. Kullanıcı adı ASCII alfanümerik 3–20; ad/soyad trim edilmiş 2–50; yeni parola en az 12 karakter/en fazla 72 UTF-8 baytı. Mevcut kısa parolayla giriş desteklenir; parola trim edilmez. Admin create varsayılan aktif öğrenci; **patch hiçbir rol/aktiflik varsayılanı üretmez**. Null preferences ve bilinmeyen alanlar 400'dür. Profil resmi HTTP(S) veya mevcut UI'ın desteklediği PNG/JPEG/WEBP/BMP base64, boş/null temizleme kabul eder; eski saklı resim okunurken yeniden yazılmaz.
- Kullanıcı/plan/yedek path ID'leri pozitif güvenli tam sayı metnidir. Kullanıcı listesinde 1junk/tekrar eden query/unsafe offset/izin verilmeyen sort veya boolean reddedilir; limit en fazla 200. Hatalı veriyi sessizce başka filtreye/sayfaya çevirmek kaldırıldı. Yetki/self-admin/oturum iptali ve tercih transaction'ları korunur.
- Auth register/login/me/refresh/profile ve admin kullanıcı yanıtları tek userResponse projeksiyonundan gelir. Parola/ORM ayrıntıları/legacyPreferences dışarı çıkmaz; nullable profil alanları tutarlıdır. Ortak runtime DTO şemaları auth/profile, admin liste/overview ve backup yanıtlarını istemcide doğrular. Bozuk yanıt başarılı boş veri/sıfır veya yeni auth snapshot'ı olmaz. API user ID sayıdır; frontend auth view sınırında String'e açıkça dönüştürülür.
- Yedek reset body ve restore ID route'ta doğrulanır; geçersiz istekte safety snapshot oluşmaz. Backup DTO host dosya yolunu döndürmez. verified gerçek boolean olmalıdır; alan yoksa istemci restore açmaz. Create/list/reset/restore yanıtları doğrulanır; safetyBackupId eksik ack başarı sayılmaz. Snapshot/checksum/rollback/bakım servisleri yeniden yazılmadı.
- Validation hata ayrıntısı ortak ApiError/ValidationIssue/validationError ile field/message dizisidir; request değerleri veya Zod iç yapısı eklenmez. Settings'in eski flattened error ayrıntısı da bu biçime hizalandı; Türkçe üst mesajlar korunur. Mevcut Sequelize güvenli 400/409/500 çevirisi korunur.

## Plan ile StudySession ayrımı

**Takvim girdisi StudySession'dır. Plan, mevcut API'de isteğe bağlı tarihli hedef kabıdır; seans planId ile açıkça bağlanabilir.** Plan oluşturmadan takvim/seans/sayaç çalışır. Tarihe bakarak otomatik ilişkilendirme, zorunlu Plan, yeni hedef ekranı veya eski veriden hedef üretimi eklenmedi. Etkinlik ve tarih aralığı mevcut Plan hedef kapsamıdır; bağlı seansı bu aralığa zorlayan yeni kısıt eklenmedi. Sahip olmayan hesap Plan'a seans bağlayamaz. Pasif hedefin geçmiş bağlantıları korunur.

Plan API, mevcut veri/FK ve ölçüm kapsamı nedeniyle korunur. Hiçbir ekrandan çağrılmayan frontend plansAPI ve kopya Plan/CreatePlanRequest tipleri kaldırıldı; takvim feature'ı gibi sunulan ikinci istemci yolu yoktur. UI'a yeni Plan yönetimi ürün kapsamı olarak eklenmiş sayılmaz.

Ortak create/update/query/goals/PlanRecord şemaları yerel route şemalarının yerini aldı. Date-only ISO girdi UTC gece yarısı olarak korunur; offset'li ISO kabul edilir, belirsiz yerel/fuzzy tarihler reddedilir. Bitiş başlangıçtan sonra olmalıdır. Kısmi tarih değişikliği mevcut satırla birlikte denetlenir. Goals patch güncel JSON ile birleşir, diğer hedef alanlarını silmez. Mevcut targetTopics sayısal sözleşmesi/tarihlerin kapsayıcı sınırı korunur.

services/plans.ts tek IMMEDIATE check/write sınırıdır: oluşturma, tarih değişikliği ve tekrar etkinleştirme aktif plan çakışmasını atomik denetler; eşzamanlı iki aynı create veya boş aralığa taşımanın yalnız biri geçer. Çakışma 409, hatalı giriş 400, yabancı/yok kayıt 404. Plan metadata aynı alanda last-writer-wins'tir; optimistic sürüm eklenmedi. Response DTO yazma transaction'ı içinde doğrulanır.

Plan silme bağlı seansları instance save ile ayırır; planId null ve session updatedAt ilerler. Not/durum/plan zamanı/duration/ölçüm kayıtları silinmez. Eski açık seans editörü 409 alır. Plan delete ve detach aynı transaction'dır; son DELETE sonrası hata dahi hepsini geri alır. Liste/detail/stats nested seansları sahip kullanıcıyla sınırlar. Plan stats mevcut measured süre servisini kullanır; embedded persisted session metadata'sı ölçüm gibi sunulmaz. Dış SQL yazıcılar domain/sürüm garantisinin dışındadır.

## Frontend form ve bağımlılık sınırı

Giriş/kayıt RHF formları ortak şemaları contractResolver ile çalıştırır; schema kopyaları kaldırıldı. Profil/parola gönderimi ortak şemaları kullanır. Geç eski hesaba ait parola değiştirme yanıtı yeni hesabı logout etmez (auth epoch denetimi).

Seans view şeması sessionForm.ts'ye ayrıldı; tarih/saat/category görünüm alanları API DTO değildir. Request oluşturulunca ortak create/updateSessionSchema ayrıca doğrulanır. Session type/Pomodoro ayarları ortak kaynaktan gelir. Formun 5–480 dakika sınırı kaldırıldı; sunucunun mevcut gerçek 1–1440 dakika sınırı ortak sessionDurationLimits/isSessionDurationValid ile kullanılır. Kesirli geçerli dakikalar korunur; 24 saati aşan/1 dakikadan kısa gerçek aralık gönderilmez. Takvim resize'ın 5 dakika snap/min UX davranışı bu API sınırından ayrı kalır. Formun render alanlarını daha küçük bileşenlere ayırma genel bakım işi olarak kalır; ikinci view/request motoru oluşturulmadı.

Preferences mevcut runtime şeması index.ts'den preferences.ts'ye taşındı; public export adları ve persisted v1 JSON değişmedi. Eski Joi doğrulama dosyası ve Joi paketi kaldırıldı. Frontend'deki son Zod 3 formu Zod 4'e geçti; üç workspace aynı 4.6.7 çözümlemesini kullanır. ContractResolver mevcut RHF'ye iç içe alan hatalarını aktarır; eski major resolver yolunu kullanmaz. Kök lock korunarak temiz npm ci geçti. Audit: 12 etkilenen paket düğümü (5 high/7 moderate/0 critical); bu paket bütün bağımlılık backlog'unu kapatmaz.

## Doğrulama ve kanıt sınırı

- Ortak sözleşmelerde 8 yeni test: auth yetki alanı reddi, short-login/new-password ayrımı, sparse patch/no default, medya/null, strict query/unsafe offset, ISO plan/goals, backup/host path, gerçek süre sınırı ve güvenli validation hata alanları.
- backend/tests/request-contracts.test.cjs: 6 gerçek HTTP/SQLite testi; normalizasyon/tutarlı DTO, geçersiz girişte veri/oturum korunması, sparse pasif admin, query/path/body sınırları, safety snapshot öncesi komut reddi ve doğrulanmış backup DTO.
- backend/tests/plans.test.cjs: 6 gerçek HTTP/SQLite testi; varsayılan/tarih/query, aynı aralık create ve partial/reactivation, eşzamanlı taşıma, sahiplik, bağımsız/bağlı seans-not-300 saniye ölçüm koruması/stale edit ve enjekte SQL sonrası rollback.
- frontend/tests/auth-forms.test.tsx: 3 gerçek React/RHF form testi; eski kısa giriş parolası, register ASCII/normalizasyon ve çok baytlı parola sınırı. Kontrollü store çağrılarıdır.
- frontend/tests/contract-transport.test.ts: 5 gerçek geçici HTTP transport testi; malformed auth/profile/liste/overview/backup/reset/restore yanıtı reddi, secret/path dışlama, ID adaptörü ve geç parola yanıtında hesap sınırı. Gerçek DB/tarayıcı E2E değildir.
- frontend/tests/session-surfaces.test.tsx: 5 yeni form regresyonu (1/1.5/1440 geçerli, 0/1441 ret); önceki 16 davranış testi korunur.
- npm run check: **18 contracts + 142 backend + 175 frontend = 335 test**, atlanan yok; naming/strict/lint/production build başarılı. Log /tmp/study-tracker-a19-check.log. Temiz kurulum /tmp/study-tracker-a19-install.log, lock audit /tmp/study-tracker-a19-audit.json.

Yeni otomatik tarayıcı E2E/WCAG/Lighthouse/yük ölçümü veya bu paket için yeni manuel tarayıcı kanıtı yoktur. Bütün DB regresyonları mkdtemp altındadır ve kapanışta temizlenir. Gerçek kullanıcı DB'sine test yazması/migration/seed/reset/restore uygulanmadı; schema 006 ve özel snapshot pointer'ları korunur. Eski A21 çalışma ağacı korunur.

## Sonraki kapsam

A19'un kalan auth/user/backup/plan giriş doğrulama ve bu yüzeylerin DTO/Plan ayrımı kapsamı tamamlandı. Bütün katalog/seans response'larının runtime şeması, bütün kaynakların optimistic metadata sözleşmesi veya ürün için yeni Plan ekranı uygulandı iddiası yoktur. Root ApiResponse generic any ve diğer mevcut any borcu bu paketle topluca kapatılmadı.

Sıradaki A22: Header bildirim hata/boş ayrımı ve popover klavye/odak; takvim klavye/dokunmatik alternatifleri, otomatik E2E/WCAG/Lighthouse. A04 offsite/retention/kapasite/kurtarma operasyonları ve bağımlılık major/güvenlik işleri açıktır.


Son ortam kontrolü: eski yalnız bu projeye ait dev ağacı kapatılıp tek root npm run dev yeniden başlatıldı. localhost:3000 HTTP 200, API 5002 health OK; port başına bir dinleyici var. Başka projelerin dev süreçlerine dokunulmadı. Log /tmp/study-tracker-a19-dev.log. Son git diff --check temiz.
