# Ekran okuyucu elle test listesi (22 Ekim 2026)

Otomatik kapsam: axe (her sayfa, açık/koyu, üç tarayıcı profili), Lighthouse erişilebilirlik 100, E2E'de klavye ile takvim gezinmesi, diyalog odak dönüşü ve grafiklerin tablo karşılığı. Aşağıdakiler otomatik testin göremediği şeylerdir: okunuş sırası, anlamlı duyurular ve gerçek ekran okuyucu davranışı. **Henüz uygulanmadı.**

Ortam: macOS VoiceOver + Safari (Cmd+F5) ve mümkünse Windows NVDA + Firefox/Chrome. Yerel geliştirme sunucusu, test hesabı (gerçek kullanıcı verisi kullanılmaz). Süre: ~20 dakika.

| # | Akış | Ne yapılır | Beklenen |
|---|---|---|---|
| 1 | Giriş | Sekme ile alanları gez, yanlış şifreyle gönder | Alan adları okunur; hata toast'ı kendiliğinden duyurulur |
| 2 | İlk kurulum | Adımları klavyeyle ilerlet | Her adımda başlık ve adım bilgisi okunur; seçimler radyo olarak duyurulur |
| 3 | Pano | Bölge (landmark) ve başlık listesini aç (VO: Rotor) | `main`, gezinme ve başlıklar mantıklı sırada; "İçeriğe geç" bağlantısı çalışır |
| 4 | Haftalık grafik | Grafik alanına gel | "Uygulama" denmez; tablo başlığı (hedef dahil) ve her gün için "gün, tarih — süre" okunur |
| 5 | Planlayıcı | Boş saate ok tuşlarıyla git, Enter | Saat/gün okunur; yeni seans diyaloğu açılır, odak içinde kalır, Esc ile kapanınca odak geri döner |
| 6 | Seans taşıma | Seans işlemleri › Saat ve süreyi değiştir | Diyalog başlığı ve alanlar okunur; kaydet sonrası sonuç duyurulur |
| 7 | Pomodoro | Başlat / duraklat | Düğme adları ve durum değişimi anlaşılır; kalan süre her saniye okunarak boğmaz |
| 8 | Ayarlar › Kelimeler | Özel kelimeler, geçersiz "-ı" hâli yaz | Hata mesajı alana bağlı okunur (`aria-describedby`); "Biçimler" önizlemesi okunur |
| 9 | Ayarlar › Bildirimler | Anahtarları değiştir | Onay kutusu durumu ve kayıt durumu duyurulur |
| 10 | Admin › Kullanıcılar | Kullanıcı işlemleri menüsü | Menü ve öğeler okunur; Esc menüyü kapatır, odak düğmeye döner |

Bulguları önem, konum, beklenen/gerçek davranış ve ekran okuyucu/tarayıcı sürümüyle `progress.md`'ye yazın; düzeltilen her bulgu için mümkünse E2E/axe kontrolü ekleyin.
