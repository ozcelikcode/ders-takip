# A21 — Admin settings and backups

17 Ekim 2026. Kullanıcı sıradaki site ayarları/yedekleme paketine geçilmesini istedi. Önce bütün memory-bank ve mevcut kod incelendi; önceki katalog/kullanıcı yönetimi değişiklikleri korundu.

## Uygulanan davranış

AdminSettingsPage nötr PageHeader/panel/düğme, isimli bölüm gezinmesi, etiketli alan ve açık kayıt durumu kullanır. Öğrenci için private settings veya backup sorgusu kurulmaz. İlk private okuma hatasında varsayılanları düzenleme açılmaz; retry sunulur. Bildirim değerlerinin yalnız saklandığı, e-posta/push teslimat altyapısının olmadığı açıkça belirtilir. Görünen site kimliği mevcut public branding kaynağına bağlıdır. Yeni formatter/dependency/şema veya kalıcı veri sözleşmesi eklenmedi.

Formun baseline ve draft snapshot'ı vardır. Pristine form yeni private okumayı izler; düzenlenen taslak refetch ile sıfırlanmaz. Bölüm değiştirme diğer alanları kaybetmez; shared siteSettingsSchema bütün formu doğrular. Hatalı alan başka bölümdeyse alan adını içeren özet görünür. Yalnız normalize edilmiş ve baseline'dan değişmiş alanlar settingsPatchSchema ile gönderilir; değişmeyen form yazma yapmaz. Bu bir optimistic version sözleşmesi değildir: aynı alan için last-writer-wins sürer. Kullanıcı açıkça vazgeçince en son private snapshot alınır; hata girdiyi korur, başarılı kayıt response snapshot'ını baseline yapar.

settingsStore admin read revision + write revision + account generation uygular. Eski private GET veya hata yeni read/save sonucunu ezmez; geç eski hesap write private/public belleği güncelleyemez. Public refresh hatası private ayar okuma hatasını değiştirmez. Private ayarlar browser storage'a yazılmaz; public branding izinli DTO'su tek önbellektir.

BackupPanel yedek listeleme sorumluluğunu ayırır. TanStack Query hesabın backups anahtarını kullanır; loading/error/retry/gerçek boş liste ayrıdır. DTO tipi frontend transport'ta tanımlıdır; bütün backup response/request şemalarının A19 runtime dönüşümü yapılmış sayılmaz. verified yalnız === true ise restore açılır; false/undefined/diğer değerler kapalı kalır. Tarih görüntüleyen kullanıcının IANA timezone tercihine bağlıdır. Manifest etiketi restore öncesi tam checksum/şema kontrolünün yerini almaz. Yedek düğmesinin sunucuda dosya oluşturduğu ve cihaz indirmesi olmadığı açıklanır.

Ayar kaydı, manuel yedek, restore ve reset tek useAccountMutation busy/epoch/mount sınırını kullanır. Pending sırasında bölüm/ayar/yedek/reset kontrolleri kilitlidir; çift yazma reddedilir. Kurtarma/reset için kaydedilmemiş taslaktan önce kaydetme veya vazgeçme gerekir. Ortak ConfirmDialog native window.confirm yerine async başarıyı bekler; hata inline kalır, açık retry gerekir; pending kapama/Escape/çift onay kilitlidir. İptal edilen eski işlemin hatası sonraki onaya taşınmaz; useAccountMutation clearError bu gerçek kullanım için eklenmiştir.

Restore onayı mevcut verinin güvenlik snapshot'ı, yedekteki hesap/parola/geçmişin geri gelmesi ve bütün oturumların kapanmasını açıklar. Başarılı restore sonrası korunan query'ler yenilenmeden logout yapılır: sunucu bütün session'ları zaten iptal ettiği için önden refetch/401 ile yeni auth yarışı üretilmez. Hata veya eski epoch yanıtı logout yapmaz. Logout bütün auth/cache sınırlarını mevcut mekanizmayla kapatır.

settings_only onayı yalnız ayarların sıfırlanacağını, hesap/ders/geçmişin korunacağını belirtir. all onayı bütün dersler (admin dersleri dahil), öğrenci hesapları, konu/ilerleme/plan/seans/ölçüm ve ayarların silineceğini; admin hesapları/yedeklerin korunacağını belirtir. Başarılı reset ilgili hesabın bütün kaynaklarını invalidate eder, private settings snapshot'ını temizleyip yeniden okur. Sabit gecikmeli window.location.reload kaldırılmıştır. Yeniden okuma başarısızsa başarıdan bağımsız bir read error/retry görünür; varsayılan form gösterilmez.

## Test kapsamı

frontend/tests/admin-settings.test.tsx: 18 ekran regresyonu, gerçek React/Headless UI/Query + gerçek settingsStore, kontrollü API. Yetki; ilk okuma/retry; no-op/dirty patch/trim/refetch; açık vazgeçme; hidden-section doğrulama ve save hatası/retry; pending/çift gönderim; backup hata/boş/retry; verified true/false/undefined; dirty maintenance kilidi; create/refetch; restore ack/error/logout ve korunan sorguları önden okumama; settings_only reset/kapama/duplicate ve cache; all kapsamı/iptal/hata payload'ı; epoch/unmount; reset sonrası read hata/retry; eski onay hatasını temizleme ve pristine refetch.

settingsStore.test.ts'e 4 davranış testi: private eski GET→yeni save, yeni read→eski error, eski account write ve public/private hata ayrımı. Mevcut 4 store testi korunur. Backend backup servisi/controller değiştirilmedi; WAL/checksum/rollback/session revocation/settings_only/all/admin koruması ve scheduler mevcut temp SQLite regresyonlarıyla doğrulanır. Gerçek kullanıcı DB'si fixture değildir.

## Kalan kapsam

A21'in bu ayar/yedekleme alt paketi uygulandı; diğer admin/modal yüzeyleri için son tasarım/kullanılmayan yol denetimi ayrı kalır. A19 auth/user update/backup/plan DTO ve Plan ürün anlamı; A22 klavye/touch/tam WCAG/Lighthouse/otomatik browser E2E; A04 offsite/retention/yük/operasyon ve bağımlılık backlog'u kapanmadı. Reset/restore sunucu servisleri yeniden yazılmadı; mevcut tek backend koordinasyon sınırı sürer.

## Tamamlanan doğrulama ve ortam

npm run check başarılı: **10 contracts + 130 backend + 138 frontend = 278 test**, 0 skipped; naming/strict TypeScript/sıfır uyarılı lint/production build geçti. Log /tmp/study-tracker-admin-settings-check.log. Son pristine-refetch testi ve küçük hook/form düzenlemeleri sonrası frontend strict/root lint ayrıca tekrar geçti (/tmp/study-tracker-settings-final-typecheck.log, /tmp/study-tracker-settings-final-lint.log). git diff --check temiz. Backend/dependency/schema değişmedi.

Production bundle ayrı localhost:3001/API 5003, mkdtemp SQLite ve sentetik admin ile doğrulandı: genel form, bölüm/taslak koruma, dirty restore/reset kilidi, açık vazgeçme, verified/unverified liste, gerçek manuel backup create/refetch, restore açıklaması/Escape/odak dönüşü, settings_only kapsamı/iptal. Tarayıcıdan restore/reset uygulanmadı. Manuel temp snapshot checksum'u manifestle aynı; integrity_check temiz, kullanıcı sayısı ve site adı hem canlı fixture hem snapshot'ta korundu. Kaydedilmemiş ad taslağı DB'ye yazılmadı. Gerçek DB veya gerçek admin parolası kullanılmadı.

Görsel kanıtlar sentetik veridir: /Users/ozcelik/.codex/visualizations/2026/10/15/01a13e5c-eabf-70f1-bd97-3a490ffe1079/admin-settings-backups-verified.png ve admin-backup-list-verified.png. Bu manuel smoke otomatik browser E2E/tam WCAG/mobil/yük kanıtı değildir.

Fixture oturumundan çıkıldı; sekme/süreç/temp DB/ignored fixture betik ve pointer temizlendi. Gerçek DB'de test yazması/migration/seed/reset/restore yok; schema 006 ve önceki özel snapshot pointer'ları korundu. Tek root dev localhost:3000/API 5002 çalışır (log /tmp/study-tracker-user-management-dev.log); health OK. Contracts export/dependency değişmedi; gereksiz dev kopyası açılmadı. Commit/push/deployment yok.
