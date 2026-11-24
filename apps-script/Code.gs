/**
 * ÖDEV YÜKLEME SİSTEMİ — Google Apps Script
 *
 * Öğrenciler: Web uygulaması linkinden kademe + ders seçer, bilgilerini girer, dosya yükler.
 * Hoca:       Linkin sonuna ?sayfa=yonetim ekleyerek şifreli yönetim paneline girer.
 *
 * Dosyalar web uygulamasını yayınlayan kişinin (hocanın) Google Drive'ında saklanır
 * ve hiç kimseyle paylaşılmaz. Öğrenciler başkalarının dosyalarını göremez.
 *
 * ÖNEMLİ (güvenlik): google.script.run ile istemciden yalnızca adı "_" ile BİTMEYEN
 * fonksiyonlar çağrılabilir. Bu yüzden tüm yardımcı fonksiyonlar "_" ile biter;
 * yönetim fonksiyonları ise her çağrıda oturum anahtarını doğrular.
 */

// ===================== AYARLAR (isterseniz değiştirin) =====================
const AYAR = {
  UYGULAMA_ADI: 'Ödev Yükleme Sistemi',
  KURUM: 'Trakya Üniversitesi · PDR',
  KOK_KLASOR_ADI: 'Ödev Yükleme Sistemi',
  KADEMELER: [1, 2, 3, 4],
  KADEME_ADLARI: { 1: 'PDR 1. Sınıf', 2: 'PDR 2. Sınıf', 3: 'PDR 3. Sınıf', 4: 'PDR 4. Sınıf' },
  MAKS_DOSYA_MB: 1024,          // Tek dosya için üst sınır (MB)
  MAKS_DOSYA_SAYISI: 10,        // Tek gönderimde en fazla dosya
  IZINLI_UZANTILAR: [
    'pdf', 'doc', 'docx', 'odt', 'rtf', 'txt',
    'ppt', 'pptx', 'xls', 'xlsx',
    'mp3', 'wav', 'm4a', 'aac', 'ogg', 'wma', 'opus',
    'mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', '3gp', 'm4v',
    'jpg', 'jpeg', 'png', 'heic',
    'zip', 'rar'
  ],
  PARCA_BAYT: 256 * 1024 * 16,  // 4 MB (256 KB'ın katı olmalı)
  OTURUM_SURESI_SN: 6 * 60 * 60,
  MAKS_HATALI_GIRIS: 5,
  KILIT_SURESI_SN: 15 * 60
};

const SAYFA_DERSLER = 'Dersler';
const SAYFA_GONDERILER = 'Gonderiler';
const BASLIK_DERSLER = ['id', 'kademe', 'ad', 'klasorId', 'aktif', 'olusturma', 'sonTeslim'];
const BASLIK_GONDERILER = ['id', 'zaman', 'kademe', 'dersId', 'dersAd', 'adSoyad', 'ogrNo',
  'eposta', 'aciklama', 'dosyaAdi', 'dosyaId', 'boyut', 'durum', 'makbuz'];

// ============================== SAYFALAR ==============================

function doGet(e) {
  const p = (e && e.parameter) || {};
  const yonetim = p.sayfa === 'yonetim';
  const t = HtmlService.createTemplateFromFile(yonetim ? 'Yonetim' : 'Ogrenci');
  t.uygulamaAdi = AYAR.UYGULAMA_ADI;
  t.kurum = AYAR.KURUM;
  t.secKademe = String(p.kademe || '');
  t.secDers = String(p.ders || '');
  t.uygulamaUrl = ScriptApp.getService().getUrl();
  return t.evaluate()
    .setTitle(yonetim ? 'Yönetim · ' + AYAR.UYGULAMA_ADI : AYAR.UYGULAMA_ADI)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include_(ad) {
  return HtmlService.createHtmlOutputFromFile(ad).getContent();
}

// ============================ KURULUM / DEPO ============================

/**
 * Apps Script düzenleyicisinden bir kez çalıştırın (izinleri vermek için).
 * Drive'da klasörü ve kayıt tablosunu oluşturur.
 */
function kurulum() {
  const a = ayarlar_();
  Logger.log('Kök klasör: ' + DriveApp.getFolderById(a.kokId).getUrl());
  Logger.log('Kayıt tablosu: ' + SpreadsheetApp.openById(a.tabloId).getUrl());
  Logger.log('Kurulum tamam. Şimdi Dağıt > Yeni dağıtım > Web uygulaması ile yayınlayın.');
}

function ayarlar_() {
  const props = PropertiesService.getScriptProperties();
  let kokId = props.getProperty('KOK_KLASOR_ID');
  let tabloId = props.getProperty('TABLO_ID');

  if (!kokId || !varMi_(function () { DriveApp.getFolderById(kokId).getName(); })) {
    kokId = DriveApp.createFolder(AYAR.KOK_KLASOR_ADI).getId();
    props.setProperty('KOK_KLASOR_ID', kokId);
  }
  if (!tabloId || !varMi_(function () { SpreadsheetApp.openById(tabloId); })) {
    const ss = SpreadsheetApp.create('Ödev Kayıtları');
    const s1 = ss.getSheets()[0];
    s1.setName(SAYFA_DERSLER);
    s1.appendRow(BASLIK_DERSLER);
    s1.setFrozenRows(1);
    const s2 = ss.insertSheet(SAYFA_GONDERILER);
    s2.appendRow(BASLIK_GONDERILER);
    s2.setFrozenRows(1);
    DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(kokId));
    tabloId = ss.getId();
    props.setProperty('TABLO_ID', tabloId);
  }
  return { kokId: kokId, tabloId: tabloId };
}

function varMi_(fn) {
  try { fn(); return true; } catch (err) { return false; }
}

function sayfa_(ad) {
  return SpreadsheetApp.openById(ayarlar_().tabloId).getSheetByName(ad);
}

function satirlar_(ad) {
  const sh = sayfa_(ad);
  basliklariTamamla_(sh, ad === SAYFA_DERSLER ? BASLIK_DERSLER : BASLIK_GONDERILER);
  const v = sh.getDataRange().getValues();
  const basliklar = v.shift();
  return v.map(function (r, i) {
    const o = { _satir: i + 2 };
    basliklar.forEach(function (b, j) { o[b] = r[j]; });
    return o;
  });
}

/** Eski sürümde oluşturulan tabloya yeni sütun başlıklarını ekler (ör. sonTeslim). */
function basliklariTamamla_(sh, basliklar) {
  const mevcut = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  basliklar.forEach(function (b, i) {
    if (mevcut[i] !== b) sh.getRange(1, i + 1).setValue(b);
  });
}

function kademeAdi_(k) {
  return AYAR.KADEME_ADLARI[k] || ('Kademe ' + k);
}

/** Ders son teslim tarihi geçti mi? */
function suresiDoldu_(d) {
  return d.sonTeslim instanceof Date && new Date() > d.sonTeslim;
}

function tarihCoz_(v) {
  if (v === '' || v === null || v === undefined) return '';
  const t = new Date(v);
  if (isNaN(t.getTime())) throw new Error('Son teslim tarihi geçersiz.');
  return t;
}

function hucreYaz_(ad, satir, alan, deger) {
  const basliklar = ad === SAYFA_DERSLER ? BASLIK_DERSLER : BASLIK_GONDERILER;
  sayfa_(ad).getRange(satir, basliklar.indexOf(alan) + 1).setValue(deger);
}

function kademeKlasoru_(kademe) {
  const kok = DriveApp.getFolderById(ayarlar_().kokId);
  const ad = temizAd_(kademeAdi_(kademe));
  const it = kok.getFoldersByName(ad);
  if (it.hasNext()) return it.next();
  const eski = kok.getFoldersByName('Kademe ' + kademe); // eski sürümden kalan klasörü yeniden adlandır
  if (eski.hasNext()) { const f = eski.next(); f.setName(ad); return f; }
  return kok.createFolder(ad);
}

function temizAd_(s) {
  return String(s).replace(/[\\/:*?"<>|#%\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function dersBul_(id) {
  const d = satirlar_(SAYFA_DERSLER).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!d) throw new Error('Ders bulunamadı.');
  return d;
}

// ============================ ÖĞRENCİ TARAFI ============================

/** Öğrenci formu için yalnızca açık (aktif) dersleri döndürür. */
function dersleriGetir() {
  const sonuc = {}, adlar = {};
  AYAR.KADEMELER.forEach(function (k) { sonuc[k] = []; adlar[k] = kademeAdi_(k); });
  satirlar_(SAYFA_DERSLER).forEach(function (d) {
    if (d.aktif === true && sonuc[d.kademe]) {
      sonuc[d.kademe].push({
        id: String(d.id), ad: d.ad,
        sonTeslim: d.sonTeslim instanceof Date ? d.sonTeslim.toISOString() : null,
        doldu: suresiDoldu_(d)
      });
    }
  });
  return {
    kademeler: sonuc,
    kademeAdlari: adlar,
    simdi: new Date().toISOString(),
    maksMB: AYAR.MAKS_DOSYA_MB,
    maksDosya: AYAR.MAKS_DOSYA_SAYISI,
    uzantilar: AYAR.IZINLI_UZANTILAR,
    parcaBayt: AYAR.PARCA_BAYT
  };
}

function ogrenciDogrula_(b) {
  const adSoyad = String(b.adSoyad || '').replace(/\s+/g, ' ').trim();
  const ogrNo = String(b.ogrNo || '').trim();
  const eposta = String(b.eposta || '').trim();
  const aciklama = String(b.aciklama || '').trim().slice(0, 1000);
  if (adSoyad.length < 3 || adSoyad.length > 80) throw new Error('Ad soyad 3–80 karakter olmalı.');
  if (!/^[A-Za-z0-9]{3,20}$/.test(ogrNo)) throw new Error('Öğrenci numarası 3–20 harf/rakam olmalı.');
  if (eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) throw new Error('E-posta adresi geçersiz.');
  if (b.kvkk !== true) throw new Error('Aydınlatma metnini onaylamanız gerekiyor.');
  return { adSoyad: adSoyad, ogrNo: ogrNo, eposta: eposta, aciklama: aciklama };
}

/**
 * Bir dosyanın yüklenmesini başlatır. Drive'da "devam ettirilebilir yükleme" oturumu açar.
 * Oturum adresi istemciye verilmez, sunucu önbelleğinde tutulur.
 */
function yuklemeBaslat(b) {
  const ogr = ogrenciDogrula_(b);
  const ders = dersBul_(b.dersId);
  if (ders.aktif !== true) throw new Error('Bu ders şu anda ödev kabul etmiyor.');
  if (suresiDoldu_(ders)) throw new Error('Bu dersin son teslim tarihi geçti; yükleme yapılamaz.');

  const dosyaAdi = temizAd_(b.dosyaAdi || '').slice(0, 150);
  const uzanti = (dosyaAdi.split('.').pop() || '').toLowerCase();
  if (!dosyaAdi || dosyaAdi.indexOf('.') < 0 || AYAR.IZINLI_UZANTILAR.indexOf(uzanti) < 0) {
    throw new Error('Bu dosya türü kabul edilmiyor: ' + dosyaAdi);
  }
  const boyut = Number(b.boyut);
  if (!(boyut > 0)) throw new Error('Dosya boş görünüyor: ' + dosyaAdi);
  if (boyut > AYAR.MAKS_DOSYA_MB * 1024 * 1024) throw new Error('Dosya çok büyük (en fazla ' + AYAR.MAKS_DOSYA_MB + ' MB).');
  const mime = String(b.mimeType || '') || 'application/octet-stream';

  // Öğrenci klasörü: Kademe X / Ders / OgrNo - Ad Soyad
  const kilit = LockService.getScriptLock();
  kilit.waitLock(30000);
  let ogrKlasor;
  try {
    const dersKlasor = DriveApp.getFolderById(ders.klasorId);
    const ad = temizAd_(ogr.ogrNo + ' - ' + ogr.adSoyad);
    const it = dersKlasor.getFoldersByName(ad);
    ogrKlasor = it.hasNext() ? it.next() : dersKlasor.createFolder(ad);
  } finally {
    kilit.releaseLock();
  }

  const kayitAdi = temizAd_(ogr.ogrNo + '_' + ogr.adSoyad + '_' + dosyaAdi);
  const yanit = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      'X-Upload-Content-Type': mime,
      'X-Upload-Content-Length': String(boyut)
    },
    payload: JSON.stringify({
      name: kayitAdi,
      parents: [ogrKlasor.getId()],
      description: kademeAdi_(ders.kademe) + ' · ' + ders.ad + '\n' + ogr.adSoyad + ' (' + ogr.ogrNo + ')' +
        (ogr.eposta ? '\n' + ogr.eposta : '') + (ogr.aciklama ? '\n\n' + ogr.aciklama : '')
    }),
    muteHttpExceptions: true
  });
  if (yanit.getResponseCode() !== 200) {
    throw new Error('Yükleme başlatılamadı (' + yanit.getResponseCode() + '). Lütfen tekrar deneyin.');
  }
  const h = yanit.getAllHeaders();
  const konum = h.Location || h.location;

  const yukId = Utilities.getUuid();
  CacheService.getScriptCache().put('yk_' + yukId, JSON.stringify({
    url: konum, boyut: boyut, mime: mime, ogr: ogr, makbuz: b.makbuz || '',
    kademe: ders.kademe, dersId: String(ders.id), dersAd: ders.ad, dosyaAdi: dosyaAdi
  }), 21600);
  return { yukId: yukId, parcaBayt: AYAR.PARCA_BAYT };
}

/** Dosyanın bir parçasını (base64) Drive'a iletir. Son parçada kaydı tabloya ekler. */
function parcaGonder(yukId, baslangic, base64) {
  const onbellek = CacheService.getScriptCache();
  const ham = onbellek.get('yk_' + yukId);
  if (!ham) throw new Error('Yükleme oturumu bulunamadı veya süresi doldu. Lütfen baştan deneyin.');
  const y = JSON.parse(ham);

  const veri = Utilities.base64Decode(base64);
  const bas = Number(baslangic);
  const son = bas + veri.length - 1;
  if (veri.length === 0 || son >= y.boyut) throw new Error('Geçersiz parça.');

  const yanit = UrlFetchApp.fetch(y.url, {
    method: 'put',
    contentType: y.mime,
    headers: { 'Content-Range': 'bytes ' + bas + '-' + son + '/' + y.boyut },
    payload: veri,
    muteHttpExceptions: true
  });
  const kod = yanit.getResponseCode();
  if (kod === 308) return { bitti: false };
  if (kod !== 200 && kod !== 201) {
    throw new Error('Parça yüklenemedi (' + kod + '). Lütfen tekrar deneyin.');
  }

  const dosya = JSON.parse(yanit.getContentText());
  onbellek.remove('yk_' + yukId);
  const kilit = LockService.getScriptLock();
  kilit.waitLock(30000);
  try {
    sayfa_(SAYFA_GONDERILER).appendRow([
      Utilities.getUuid(), new Date(), y.kademe, y.dersId, y.dersAd,
      y.ogr.adSoyad, "'" + y.ogr.ogrNo, y.ogr.eposta, y.ogr.aciklama,
      y.dosyaAdi, dosya.id, y.boyut, 'aktif', y.makbuz
    ]);
  } finally {
    kilit.releaseLock();
  }
  return { bitti: true };
}

// ============================ YÖNETİM: GİRİŞ ============================

function sifreOzeti_(sifre, tuz) {
  let ozet = tuz + '|' + sifre;
  for (let i = 0; i < 500; i++) {
    ozet = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, ozet + tuz, Utilities.Charset.UTF_8));
  }
  return ozet;
}

function oturumAc_() {
  const anahtar = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('oturum_' + anahtar, '1', AYAR.OTURUM_SURESI_SN);
  return anahtar;
}

function yetki_(anahtar) {
  const c = CacheService.getScriptCache();
  if (!anahtar || c.get('oturum_' + anahtar) !== '1') throw new Error('OTURUM_YOK');
  c.put('oturum_' + anahtar, '1', AYAR.OTURUM_SURESI_SN); // süreyi uzat
}

function yonetimDurum() {
  return { sifreVar: !!PropertiesService.getScriptProperties().getProperty('SIFRE_OZET') };
}

/** Yalnızca henüz şifre belirlenmemişse çalışır (ilk kurulum). */
function sifreOlustur(sifre) {
  const props = PropertiesService.getScriptProperties();
  const kilit = LockService.getScriptLock();
  kilit.waitLock(10000);
  try {
    if (props.getProperty('SIFRE_OZET')) throw new Error('Şifre zaten belirlenmiş.');
    if (String(sifre || '').length < 8) throw new Error('Şifre en az 8 karakter olmalı.');
    const tuz = Utilities.getUuid();
    props.setProperties({ SIFRE_TUZ: tuz, SIFRE_OZET: sifreOzeti_(String(sifre), tuz) });
  } finally {
    kilit.releaseLock();
  }
  ayarlar_();
  return oturumAc_();
}

function girisYap(sifre) {
  const c = CacheService.getScriptCache();
  const hata = Number(c.get('hatali_giris') || 0);
  if (hata >= AYAR.MAKS_HATALI_GIRIS) {
    throw new Error('Çok fazla hatalı deneme. Lütfen ' + (AYAR.KILIT_SURESI_SN / 60) + ' dakika sonra tekrar deneyin.');
  }
  const props = PropertiesService.getScriptProperties();
  const ozet = props.getProperty('SIFRE_OZET');
  if (!ozet || sifreOzeti_(String(sifre || ''), props.getProperty('SIFRE_TUZ')) !== ozet) {
    c.put('hatali_giris', String(hata + 1), AYAR.KILIT_SURESI_SN);
    throw new Error('Şifre hatalı.');
  }
  c.remove('hatali_giris');
  return oturumAc_();
}

function oturumKontrol(anahtar) {
  try { yetki_(anahtar); return true; } catch (e) { return false; }
}

function cikisYap(anahtar) {
  if (anahtar) CacheService.getScriptCache().remove('oturum_' + anahtar);
  return true;
}

function sifreDegistir(anahtar, eski, yeni) {
  yetki_(anahtar);
  const props = PropertiesService.getScriptProperties();
  if (sifreOzeti_(String(eski || ''), props.getProperty('SIFRE_TUZ')) !== props.getProperty('SIFRE_OZET')) {
    throw new Error('Mevcut şifre hatalı.');
  }
  if (String(yeni || '').length < 8) throw new Error('Yeni şifre en az 8 karakter olmalı.');
  const tuz = Utilities.getUuid();
  props.setProperties({ SIFRE_TUZ: tuz, SIFRE_OZET: sifreOzeti_(String(yeni), tuz) });
  return true;
}

// ============================ YÖNETİM: VERİ ============================

function panelVerisi(anahtar) {
  yetki_(anahtar);
  const a = ayarlar_();
  const sayac = {};
  satirlar_(SAYFA_GONDERILER).forEach(function (g) {
    if (g.durum !== 'aktif') return;
    const s = sayac[g.dersId] || (sayac[g.dersId] = { dosya: 0, ogrenci: {}, son: null });
    s.dosya++;
    s.ogrenci[String(g.ogrNo)] = true;
    if (!s.son || g.zaman > s.son) s.son = g.zaman;
  });
  const kademeler = {}, adlar = {};
  AYAR.KADEMELER.forEach(function (k) { kademeler[k] = []; adlar[k] = kademeAdi_(k); });
  satirlar_(SAYFA_DERSLER).forEach(function (d) {
    if (!kademeler[d.kademe]) return;
    const s = sayac[String(d.id)] || { dosya: 0, ogrenci: {}, son: null };
    kademeler[d.kademe].push({
      id: String(d.id), ad: d.ad, aktif: d.aktif === true,
      klasorUrl: 'https://drive.google.com/drive/folders/' + d.klasorId,
      dosyaSayisi: s.dosya, ogrenciSayisi: Object.keys(s.ogrenci).length,
      sonGonderi: s.son ? s.son.toISOString() : null,
      sonTeslim: d.sonTeslim instanceof Date ? d.sonTeslim.toISOString() : null,
      doldu: suresiDoldu_(d)
    });
  });
  return {
    kademeler: kademeler,
    kademeAdlari: adlar,
    kokUrl: 'https://drive.google.com/drive/folders/' + a.kokId,
    tabloUrl: 'https://docs.google.com/spreadsheets/d/' + a.tabloId,
    uygulamaUrl: ScriptApp.getService().getUrl()
  };
}

function dersEkle(anahtar, kademe, ad, sonTeslim) {
  yetki_(anahtar);
  kademe = Number(kademe);
  ad = temizAd_(ad || '').slice(0, 100);
  if (AYAR.KADEMELER.indexOf(kademe) < 0) throw new Error('Geçersiz kademe.');
  if (ad.length < 2) throw new Error('Ders adı en az 2 karakter olmalı.');
  const ayni = satirlar_(SAYFA_DERSLER).some(function (d) {
    return Number(d.kademe) === kademe && String(d.ad).toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr');
  });
  if (ayni) throw new Error('Bu kademede aynı adlı bir ders zaten var.');
  const teslim = tarihCoz_(sonTeslim);
  const klasor = kademeKlasoru_(kademe).createFolder(ad);
  const id = Utilities.getUuid().slice(0, 8);
  sayfa_(SAYFA_DERSLER).appendRow([id, kademe, ad, klasor.getId(), true, new Date(), teslim]);
  return id;
}

function dersGuncelle(anahtar, id, degisiklik) {
  yetki_(anahtar);
  const d = dersBul_(id);
  if (degisiklik.ad !== undefined) {
    const ad = temizAd_(degisiklik.ad).slice(0, 100);
    if (ad.length < 2) throw new Error('Ders adı en az 2 karakter olmalı.');
    hucreYaz_(SAYFA_DERSLER, d._satir, 'ad', ad);
    DriveApp.getFolderById(d.klasorId).setName(ad);
  }
  if (degisiklik.sonTeslim !== undefined) {
    hucreYaz_(SAYFA_DERSLER, d._satir, 'sonTeslim', tarihCoz_(degisiklik.sonTeslim));
  }
  if (degisiklik.aktif !== undefined) {
    hucreYaz_(SAYFA_DERSLER, d._satir, 'aktif', degisiklik.aktif === true);
  }
  return true;
}

/** Yalnızca hiç gönderisi olmayan ders silinebilir; diğerleri "kapatılır". */
function dersSil(anahtar, id) {
  yetki_(anahtar);
  const d = dersBul_(id);
  const gonderiVar = satirlar_(SAYFA_GONDERILER).some(function (g) {
    return String(g.dersId) === String(id) && g.durum === 'aktif';
  });
  if (gonderiVar) throw new Error('Bu derste ödev var; silmek yerine "Kapat" kullanın.');
  try { DriveApp.getFolderById(d.klasorId).setTrashed(true); } catch (e) { /* klasör yoksa geç */ }
  sayfa_(SAYFA_DERSLER).deleteRow(d._satir);
  return true;
}

function gonderileriGetir(anahtar, dersId) {
  yetki_(anahtar);
  return satirlar_(SAYFA_GONDERILER)
    .filter(function (g) { return String(g.dersId) === String(dersId) && g.durum === 'aktif'; })
    .map(function (g) {
      return {
        id: String(g.id), zaman: g.zaman instanceof Date ? g.zaman.toISOString() : String(g.zaman),
        adSoyad: g.adSoyad, ogrNo: String(g.ogrNo), eposta: g.eposta, aciklama: g.aciklama,
        dosyaAdi: g.dosyaAdi, dosyaId: g.dosyaId, boyut: Number(g.boyut) || 0, makbuz: String(g.makbuz || '')
      };
    })
    .reverse();
}

function gonderiSil(anahtar, gonderiId) {
  yetki_(anahtar);
  const g = satirlar_(SAYFA_GONDERILER).filter(function (x) { return String(x.id) === String(gonderiId); })[0];
  if (!g) throw new Error('Kayıt bulunamadı.');
  try { DriveApp.getFileById(g.dosyaId).setTrashed(true); } catch (e) { /* dosya yoksa geç */ }
  hucreYaz_(SAYFA_GONDERILER, g._satir, 'durum', 'silindi');
  return true;
}
