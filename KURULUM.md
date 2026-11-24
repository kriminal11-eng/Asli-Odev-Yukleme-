# Kurulum (yaklaşık 10 dakika)

Bilgisayardan, ödevlerin toplanacağı Google hesabıyla giriş yapmış olarak yapın.

## 1. Projeyi oluşturun

1. <https://script.google.com> adresine gidin → **Yeni proje**.
2. Sol üstteki “Adsız proje” yazısına tıklayıp adını **Ödev Yükleme Sistemi** yapın.

## 2. Dosyaları kopyalayın

1. Soldaki **Proje Ayarları** (⚙️) → **“appsscript.json” manifest dosyasını düzenleyicide göster** kutusunu işaretleyin.
2. **Düzenleyici**ye (`< >`) dönün. Şu dosyaların içeriğini bu depodaki karşılıklarıyla **tamamen değiştirin**:
   - `Kod.gs` (veya `Code.gs`) ← `apps-script/Code.gs`
   - `appsscript.json` ← `apps-script/appsscript.json`
3. **Dosyalar** yanındaki **+** → **HTML** ile üç dosya ekleyin. Adlarını **uzantısız ve birebir** yazın:
   - `Ogrenci` ← `apps-script/Ogrenci.html`
   - `Yonetim` ← `apps-script/Yonetim.html`
   - `Stil` ← `apps-script/Stil.html`
4. **Kaydet** (💾 ya da Ctrl+S).

## 3. İzinleri verin (bir kez)

1. Üstteki fonksiyon listesinden **kurulum**'u seçip **Çalıştır**'a basın.
2. “Yetkilendirme gerekli” → **İzinleri incele** → hesabınızı seçin.
3. “Google bu uygulamayı doğrulamadı” uyarısı çıkarsa: **Gelişmiş** → **Ödev Yükleme Sistemi'ne git (güvenli değil)** → **İzin ver**.
   (Bu uyarı, kodu kendiniz yazdığınız için çıkar; uygulama yalnızca sizin hesabınızda çalışır.)
4. Çalışınca Drive'ınızda **Ödev Yükleme Sistemi** klasörü ve içinde **Ödev Kayıtları** tablosu oluşur.

## 4. Web uygulaması olarak yayınlayın

1. Sağ üstte **Dağıt** → **Yeni dağıtım** → tür olarak ⚙️ **Web uygulaması**.
2. Ayarlar:
   - **Şu kullanıcı olarak yürüt:** *Ben* (kendi e-postanız)
   - **Erişimi olan kullanıcılar:** *Herkes*
3. **Dağıt** → çıkan **Web uygulaması URL'sini** kopyalayın (`https://script.google.com/macros/s/…/exec`).

> “Herkes” seçeneği öğrencilerin Google hesabıyla giriş yapmadan yükleyebilmesi içindir.
> Öğrenciler **sadece yükleme formunu** görür; Drive klasörünüz kimseyle paylaşılmaz.
> Öğrencilerin Google hesabıyla giriş yapmasını şart koşmak isterseniz “Google Hesabı olan herkes”i seçebilirsiniz.

## 5. Yönetim şifrenizi belirleyin (hemen yapın)

1. Kopyaladığınız linkin sonuna `?sayfa=yonetim` ekleyip açın:
   `https://script.google.com/macros/s/…/exec?sayfa=yonetim`
2. İlk açılışta **şifre belirleme** ekranı gelir. En az 8 karakterlik bir şifre belirleyin.
3. Bu linki tarayıcınızda yer imlerine ekleyin. (Chrome'da ⋮ → **Yayınla, kaydet ve paylaş → Kısayol oluştur → Pencere olarak aç** derseniz masaüstünüzde program gibi açılır.)

## 6. Dersleri oluşturun ve linki paylaşın

1. Yönetim panelinde **Kademe 1…4** sekmelerinde istediğiniz adla dersleri/sınıfları ekleyin.
2. Öğrencilere iki şekilde link verebilirsiniz:
   - **Öğrenci linki** (üst menü): öğrenci kademe ve dersi kendisi seçer.
   - **Ders linki** (ders kartında): kademe ve ders hazır seçili gelir.

## Bilgisayardan dosyalara erişim

- **Panelden:** her dosyada **İndir / Aç** düğmeleri vardır.
- **Toplu indirme:** ders kartındaki **Drive** düğmesi → klasöre sağ tık → **İndir** (ZIP olarak iner).
- **Program gibi otomatik:** bilgisayarınıza [Google Drive masaüstü uygulamasını](https://www.google.com/drive/download/) kurun.
  “Ödev Yükleme Sistemi” klasörü Windows Gezgini'nde normal klasör olarak görünür, yeni ödevler kendiliğinden gelir.

## Kodu güncellediğinizde

Kodda değişiklik yaptıysanız: **Dağıt → Dağıtımları yönet → ✏️ (düzenle) → Sürüm: Yeni sürüm → Dağıt.**
Bu şekilde link **değişmez**. (“Yeni dağıtım” derseniz yeni bir link oluşur.)

## Ayarlar

`Code.gs` dosyasının başındaki `AYAR` bölümünden değiştirebilirsiniz:

| Ayar | Varsayılan | Açıklama |
|---|---|---|
| `KURUM` | Trakya Üniversitesi · PDR | Sayfa başlığında görünen yazı |
| `MAKS_DOSYA_MB` | 1024 | Tek dosya için üst sınır |
| `MAKS_DOSYA_SAYISI` | 10 | Bir gönderimde en fazla dosya |
| `IZINLI_UZANTILAR` | pdf, doc, docx, mp3, mp4, … | Kabul edilen dosya türleri |

## Sık sorulanlar

- **Şifremi unuttum:** script.google.com → projeniz → ⚙️ Proje Ayarları → **Komut dosyası özellikleri** → `SIFRE_OZET` ve `SIFRE_TUZ` satırlarını silin. Yönetim linkini açınca yeniden şifre belirleme ekranı gelir.
- **Kota:** Dosyalar kendi Drive kotanızdan yer kaplar (ücretsiz hesapta 15 GB; üniversite Google Workspace hesabıysa genellikle çok daha fazla). Çok video toplanacaksa üniversite hesabıyla kurmanız önerilir.
- **Öğrenci aynı ödevi tekrar yüklerse:** yeni dosya da aynı öğrenci klasörüne eklenir; panelde tarihleriyle birlikte görürsünüz.
- **Başkası panele girebilir mi?** Şifre olmadan hayır. 5 hatalı denemede panel 15 dakika kilitlenir.
