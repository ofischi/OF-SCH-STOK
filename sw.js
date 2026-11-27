/* OFISCHI Stok — service worker
   Yalnızca programın kendi dosyaları önbelleğe alınır.
   Supabase istekleri (veri, giriş, canlı bağlantı) ASLA önbelleğe alınmaz; her zaman canlıdan gelir. */
const SURUM = 'ofs-stok-v3';
const KABUK = ['./', './index.html', './manifest.webmanifest', './favicon.ico',
  './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './favicon-32.png', './favicon-16.png'];
const CDN = ['cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(KABUK)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== SURUM).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'GUNCELLE') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.endsWith('.supabase.co') || u.hostname.endsWith('.supabase.in')) return;

  // Sayfa: önce internetten (güncel sürüm), internet yoksa önbellekten
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => {
      const kopya = res.clone();
      caches.open(SURUM).then(c => c.put('./index.html', kopya));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  // Sürüm numaralı kütüphaneler: önbellekten (değişmezler)
  if (CDN.includes(u.hostname)) {
    e.respondWith(caches.match(r).then(h => h || fetch(r).then(res => {
      if (res.ok) { const k = res.clone(); caches.open(SURUM).then(c => c.put(r, k)); }
      return res;
    })));
    return;
  }

  // Kendi dosyalarımız (ikonlar, manifest): önbellekten göster, arkada tazele
  if (u.origin === self.location.origin) {
    e.respondWith(caches.match(r).then(h => {
      const ag = fetch(r).then(res => {
        if (res.ok) { const k = res.clone(); caches.open(SURUM).then(c => c.put(r, k)); }
        return res;
      }).catch(() => h);
      return h || ag;
    }));
  }
});
