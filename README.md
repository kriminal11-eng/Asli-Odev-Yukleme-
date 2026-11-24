# Ödev Yükleme Sistemi

Öğrencilerin Word, PDF, ses (mp3…) ve video (mp4…) ödevlerini **tek bir linkten** yükleyebildiği,
dosyaların yalnızca öğretim elemanının Google Drive'ında saklandığı küçük bir web uygulaması.
Google Apps Script ile çalışır: sunucu, hosting ya da ücret gerekmez.

## Ne yapar?

**Öğrenci tarafı** (paylaştığınız link)
- PDR 1.–4. Sınıf arasından sınıfını seçer → altındaki dersi seçer
- Ad soyad, öğrenci no, (isteğe bağlı) e-posta ve not girer
- Bir veya birden çok dosya yükler (dosya başına 1 GB'a kadar, büyük videolar parça parça yüklenir)
- Sonunda bir **gönderim kodu** görür. Başka hiçbir öğrencinin dosyasını göremez.

**Hoca tarafı** (`…/exec?sayfa=yonetim`, şifreli)
- Her sınıf (PDR 1.–4. Sınıf) için sekme; altına istediğiniz adla ders/sınıf ekleme, adını değiştirme, silme
- Derse son teslim tarihi koyma (süre dolunca yükleme otomatik kapanır)
- Dersi “Kapat” ile ödev kabulüne kapatma, “Aç” ile tekrar açma
- Her derse özel öğrenci linki (kademe ve ders seçili gelir)
- Ders bazında ödevleri öğrenciye göre gruplanmış görme, arama, tek tıkla indirme/açma/silme
- Listeyi Excel'de açılabilen CSV olarak indirme
- Tüm dosyalar Drive'da `Ödev Yükleme Sistemi / PDR X. Sınıf / Ders / ÖğrNo - Ad Soyad /` düzeninde

## Kurulum

Adım adım anlatım: **[KURULUM.md](KURULUM.md)**

## Dosyalar

| Dosya | Görev |
|---|---|
| `apps-script/Code.gs` | Sunucu kodu (Drive, kayıt tablosu, şifre, yükleme) |
| `apps-script/Ogrenci.html` | Öğrenci yükleme sayfası |
| `apps-script/Yonetim.html` | Şifreli yönetim paneli |
| `apps-script/Stil.html` | Ortak görünüm |
| `apps-script/appsscript.json` | Proje ayarları (izinler, web uygulaması) |
