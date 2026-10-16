# Ders Takip Sistemi — Aktif Bağlam

Son güncelleme: 16 Ekim 2026, tercihler/hesap sınırları/site kimliği paketi.

## Kalıcı kullanıcı talimatları

Disiplinli, derli toplu, sürdürülebilir mühendislik; gereksiz/eskimiş/tekrarlı veya varsayımsal kod tutulmaz. Teknik kod/paket/dosya/klasör adları ve yeni geliştirici yorum/logları İngilizce; Türkçe UI ve lokalize kalıcı değerler korunur. Strict/kalite kapıları kapatılmaz. Bütün memory-bank her iş başında okunur. AGENTS.md, workingPrinciples.md ve design-system.md geçerlidir.

Modern sade nötr Vercel/Geist benzeri dil uygulandı; eski pastel/iOS/glass yönü geçersiz. Yeni sayfalar ortak token, PageHeader ve kontrolleri kullanır.

## Son kullanıcı isteği ve sonuç

Site adı bütünüyle admin'den değişebilir olmalı. Admin paneli mevcut: /admin, /admin/users, /admin/courses, /admin/settings; yeni panel kopyası yok. Genel ayarlardaki ad/açıklama/logo/ikon bütün Brand/login/register/sidebar/loading/title/meta/favicon yüzeylerine bağlandı. Gerçek siteye kullanıcı adına yeni ad verilmedi; “Odak Atlası” yalnız atılabilir fixture'dır. Teknik repo/paket adları ve hosting domain'i görünen addan bağımsızdır.

Sıradaki Preferences/cache paketi uygulandı. packages/contracts ortak Zod 4/tipler; explicit 003-user-preferences-v1 migration ve kayıpsız legacyPreferences arşivi; private tercihler yalnız sunucu+mevcut hesap belleği. Sunucu onaylı sıralı patch, hata/pending gösterimi, hesap/epoch/generation sınırı. Eski sahipsiz browser değerleri unassigned-account-state içinde arşivlenir, başka hesaba uygulanmaz. Okundu bildirimleri hesap anahtarlı. Yeni Pomodoro formu kişisel varsayılanı kullanır; mevcut seans ayarı korunur.

Bütün Query anahtarları account factory altında; session'larda timezone/tarih, günlük sorgularda gün değişimi ve ilgili bütün özetleri kapsayan invalidation var. Layout hesap değişince yeniden kurulur. Public branding ve private admin ayar API'si ayrıldı; ayar yazmaları şemalı/transaction'lı. Kişisel tema override kaldırılınca site rengi döner.

Son kontrol: temiz npm ci ve npm run check; 3 contracts + 52 backend + 31 frontend = 86 test, atlanan yok; adlandırma, strict typecheck, sıfır uyarılı lint ve production build'ler başarılı. İki hesap/geçici DB ile site kimliği, reload teması, hesap ayrımı ve 35 dakikalık yeni Pomodoro varsayılanı tarayıcıda doğrulandı. Tam otomatik E2E/WCAG/Lighthouse değildir. Detay: implementation/2026-10-16-preferences-and-site-identity.md.

## Yerel ortam ve verinin korunması

15 Ekim'de kullanıcı ilk kurulum istedi; admin@example.com / username admin oluşturuldu. Parola .local/admin-password.txt içinde 0600; değerini sohbete/loga/belgeye kopyalamayın. .env/DB/.local/backups Git dışında.

16 Ekim'de schema 003 normal yerel yükseltme olarak uygulandı. Önce private native snapshot alındı; yolu .local/preferences-upgrade-2026-10-16.json içinde. Hesap/parola hash/oturum ve mevcut kayıt sayıları korundu; ardından güncel şema yedeği id 3 oluşturuldu. Gerçek DB'de reset/restore/seed yapılmadı. Eski şemalı yedekler korunur fakat güncel restore şema kapısını geçmez; ayrı kopyada kontrollü dönüşüm/uyumlu sürüm gerekir.

Uygulama localhost:3000, API 5002. Root npm run dev sözleşmeleri önce derler, Vite --force cache'i temizler. Sözleşme export'u değişirse dev süreci yeniden başlatılır. Çift Vite fixture aynı dependency cache'ini paylaşmamalı. Test sunucuları/DB/sekme temizlendi; asıl yerel dev süreci iş sonunda çalışır bırakılır. Commit/push/deployment yapılmadı.

## Korunan önceki kazanımlar

İptal edilebilir DB session + hash'li tek kullanımlık refresh; HttpOnly/SameSite Strict cookie, CSRF/Origin ve kısa HS256 access; memory-only access/epoch/Web Locks/çevrimdışı logout sınırı. Parola/rol/aktiflik/admin kurtarma ilgili session'ları iptal eder. Native WAL snapshot/atomik restore, checksum/integrity/FK/şema kontrolü, safety/rollback/bakım kapısı, transaction'lı reset ve geçen süreye göre yedek planı var. Kapsam tek backend sürecidir; offsite/retention/disk kaybı tatbikatı yok.

Foundation/design/security tarihsel kanıtları implementation/2026-10-15-foundation.md, design-system.md ve implementation/2026-10-15-security-and-recovery.md içindedir. Audit başlangıç fotoğrafıdır; güncel kapanış progress.md'den izlenir.

## Sıradaki işler

1. StudySession create/move için atomik çakışma ve ortak durum makinesi (A07/A08).
2. Planlanan/gerçek süre ayrımı, pause/resume ve timezone aralıkları (A09/A16). Tercihin kaydedilmesi backend timezone hesabının düzeldiği anlamına gelmez.
3. Diğer ders/kategori/konu silme/sıralama transaction bütünlüğü (A10).
4. Tek timer/planner motoru, doğru admin agregasyonları ve kalan ayar uygulaması (A15/A17/A18). allowRegistration/maintenanceMode/sessionTimeout henüz sunucuda uygulanmıyor; bildirim tercihleri delivery altyapısı değildir.
5. Kalan güvenlik/bağımlılık major geçişleri; 12 paket düğümü (5 high/7 moderate) hâlâ audit backlog'u. Bütün kütüphaneler en yeni major'a taşınmış değil.
6. Otomatik tarayıcı E2E, erişilebilirlik/mobil, performans ve gerçek ortam kurtarma/kapasite/offsite doğrulaması.

Ürün eğitim/TYT-AYT ve genel görev takibi arasında farklı anlatımlar taşıyor; yeni özellik öncesi yön netleştirilmeli. AI/sosyal/offline aktif öncelik değil.
