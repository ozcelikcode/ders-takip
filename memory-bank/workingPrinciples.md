# Kalıcı Mühendislik ve Çalışma İlkeleri

Kaynak: Kullanıcının 15 Ekim 2026 tarihli açık talimatı. Bu ilkeler sonraki bütün geliştirme çalışmalarında geçerlidir.

## Temel beklenti

Proje vibe coding ile başlamıştır; bundan sonraki çalışma derli toplu, disiplinli, sürdürülebilir ve ileri düzey mühendislik standartlarıyla yürütülmelidir. Mevcut üründen devam edilir. Her değişiklik anlaşılır bir probleme, gerekçeye ve doğrulanabilir sonuca dayanır.

## Adlandırma standardı (15 Ekim 2026 ek talimatı)

- Bütün kod sembolleri, değişken/fonksiyon/sınıf/tip adları, API alanları ve yeni dosya/klasör adları İngilizce olmalıdır. Açıklayıcı ve tutarlı adlandırma kullanılır.
- Bu kural kullanıcıya görünen metinleri İngilizceye çevirmek anlamına gelmez. Türkçe arayüz, içerik ve yerelleştirilmiş veri değerleri korunur; mevcut kalıcı veri sözleşmeleri migration olmadan yeniden adlandırılmaz.
- Yeni teknik yorumlar ve geliştirici logları İngilizce yazılır. Dokümantasyonun içeriği Türkçe olabilir; dosya adları İngilizce kalır.
- Projenin Git deposu/çalışma dizini yerinde korunur; uygulama içi teknik adlandırma İngilizcedir. 16 Ekim ek talimatıyla görünen ürün adı/kimliği admin ayarından tamamen değişebilir; kod, repo/paket adı veya hosting domain'ine bağlanmaz. Gereksiz eski dosya yeni adla arşivlenmez, referans kontrolünden sonra kaldırılır.

## Güncellik ve kodun yaşam döngüsü

- Desteği bitmiş runtime, araç ve bağımlılıklar kalıcı geliştirme tabanı olarak kullanılmaz. Resmî destek durumu ve güvenlik bildirimleri güncelleme öncesinde doğrulanır.
- Yeni geliştirmeler güncel, kararlı, bakımı süren teknolojilerle yapılır. Sırf sürüm numarası eski diye çalışan bir sistem körlemesine değiştirilmez; destek, güvenlik, uyumluluk ve bakım maliyeti somut olarak değerlendirilir.
- Gereksiz, kullanılmayan, yinelenen, geçici çözüm olarak kalmış veya mevcut mimariyle uyuşmayan kod biriktirilmez. Referansları ve veri etkisi incelenerek kaldırılır. Kaynak geçmişi Git'te tutulur; kod tabanında eski alternatif uygulamalar saklanmaz.
- Varsayımsal gelecek ihtiyaçları için kullanılmayan soyutlamalar, servisler, ekranlar ve bağımlılıklar eklenmez. Geleceğe uygunluk; açık sorumluluklar, sağlam sözleşmeler, veri güvenliği ve kolay değiştirilebilirlikle sağlanır.
- Büyük güncellemeler küçük ve doğrulanabilir adımlarla yapılır. Geçiş kodu gerekiyorsa kapsamı, kaldırılma koşulu ve takip kaydı bulunur; kalıcı ikinci bir uygulamaya dönüşmez.

## Değişiklik disiplini

- Her işin başında bütün memory-bank dosyaları okunur; mevcut kaynak kod ve doğrulama sonuçlarıyla karşılaştırılır.
- İstenen davranış ve kabul ölçütleri uygulamadan önce netleştirilir. Güvenlik, veri bütünlüğü ve gerçek kullanıcı akışları önceliklidir.
- Aynı iş kuralının farklı ekranlarda veya controller'larda ayrı uygulamaları oluşturulmaz. Yetki, zaman, durum geçişi ve süre hesaplarının tek bir tanımı olmalıdır.
- TypeScript strict kuralları susturularak, rastgele `any`, `@ts-ignore`, lint kapatma veya başarısız testleri atlayarak iş tamamlanmış sayılmaz.
- Kilit dosyası ve seçilmiş Node/npm sürümleriyle tekrarlanabilir kurulum hedeflenir. Kontroller otomatikleştirilir; kritik hatalar düzeltildiğinde anlamlı regresyon testleri eklenir.
- Veritabanı değişiklikleri açık migration ile yapılır. Normal açılışta tablo silme, otomatik şema onarma, sessiz veri sıfırlama ve sabit gizli anahtarla devam etme kabul edilmez.
- Kullanıcının mevcut verisi korunur. İnceleme sırasında seed, reset, restore ve yıkıcı şema komutları çalıştırılmaz. Veri dönüşümlerinin yedekleme, doğrulama ve geri dönüş yöntemi tanımlanır.
- Bir işin tamamlanması; ilgili davranışın doğrulanmasını, gerekli kontrollerin geçmesini, kullanılmayan eski yolun kaldırılmasını ve memory-bank'in güncellenmesini içerir.

## Dokümantasyon doğruluğu

- Uygulanmış, kontrol edilmiş, planlanmış ve varsayılmış bilgiler birbirinden açıkça ayrılır.
- Bir özelliğin kodda bulunması, doğru çalıştığının kanıtı değildir. Ölçülmemiş performans değerleri ve yapılmamış testler başarı olarak yazılmaz.
- Önemli bulgular önem derecesi, kaynak konumu, etkisi, düzeltme yaklaşımı ve kabul ölçütüyle kaydedilir.
- `activeContext.md` ve `progress.md` her anlamlı çalışma sonunda güncellenir. Yeni kararlar ilgili mimari veya teknik bağlama işlenir.
- Ürün yönüyle ilgili eski belgeler güncel kararın yerine geçmez. Güncel durum ile tarihsel hedef çelişiyorsa çelişki açıkça belirtilir.

## Bu ilkelerin ilk uygulaması

15 Ekim 2026 incelemesi yalnızca değerlendirme ve dokümantasyon çalışmasıdır. Sorunların listelenmesi düzeltildikleri anlamına gelmez. Mevcut açıklar ve doğrulama sınırları `audits/2026-10-15-project-audit.md` içinde kayıtlıdır.

## Uygulama başlangıcı

15 Ekim 2026 ek talimatıyla ilk iyileştirme paketi uygulandı. Güncel sonuçlar progress.md ve implementation/2026-10-15-foundation.md içindedir; önceki audit tarihsel olarak korunur.

## Tasarım standardı (15 Ekim 2026 ek talimatı)

Modern, basit, sade ve özenli tasarım zorunludur. Vercel/Geist ve Linear'ın güncel resmî örneklerinden yararlanılır; görsel kararlar `design-system.md` içinde tutulur. Eski iOS/pastel/glassmorphism yönü geçersizdir. Nötr yüzeyler, belirgin tipografi, ince sınırlar, ölçülü boşluk ve anlamlı renk esastır. Kod/dosya adları İngilizce, kullanıcı içeriği Türkçe kalır.

## Yerel hesap ve gizli bilgiler (15 Ekim 2026)

Kullanıcının açık ilk kurulum talimatı, yeni yerel ortam/veritabanı ve admin hesabı oluşturmayı yetkilendirdi. Bu izin gelecekte gerçek DB üzerinde doğrulama amaçlı reset/restore/seed izni değildir. Admin oluşturma/kurtarma admin:manage üzerinden yapılır; parola yalnız özel izinli, Git dışı dosyadan okunur. Secret/parola/token değerleri memory-bank, sohbet, komut argümanı veya loga kopyalanmaz. Kayıtlarda yalnız dosya yolu, yetki kapsamı ve doğrulanan sonuç tutulur.

## Değiştirilebilir site kimliği (16 Ekim 2026)

Site adı, açıklama, logo/ikon bütün görünen yüzeylerde tek public branding kaynağından türetilir. Yeni ekranda sabit ürün adı yazılmaz. Admin paneli mevcuttur; önce mevcut yönetim akışı geliştirilir. Private yönetim ayarları anonim API veya kalıcı browser cache'ine çıkarılmaz. Kullanıcı yeni adı belirtmedikçe gerçek siteye test adı verilmez.
