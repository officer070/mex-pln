// Service worker MEX — naikkan VERSI setiap kali ikon/manifest/aset diganti
const VERSI = 'mex-v2';
const ASET = [
  './',
  'index.html',
  'manifest.json',
  'icon/icon-192.png',
  'icon/icon-512.png',
  'icon/icon-maskable-512.png',
  'icon/favicon-48.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSI)
      .then(c => Promise.all(ASET.map(u => c.add(u).catch(() => {}))))   // satu aset gagal tidak membatalkan pemasangan
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Hanya aset milik aplikasi ini. Apps Script, font, CDN, dll. langsung ke jaringan,
  // jadi data order/stok/reservasi TIDAK PERNAH diambil dari cache.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  // Halaman: jaringan dulu supaya update langsung terlihat; cache hanya cadangan saat offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          const salinan = res.clone();
          caches.open(VERSI).then(c => c.put(req, salinan));
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then(hit => hit || caches.match('index.html') || caches.match('./'))
        )
    );
    return;
  }

  // Aset statis (ikon, dll.): pakai cache, perbarui diam-diam di belakang
  e.respondWith(
    caches.match(req).then(hit => {
      const jaringan = fetch(req)
        .then(res => {
          if (res && res.ok) {
            const salinan = res.clone();
            caches.open(VERSI).then(c => c.put(req, salinan));
          }
          return res;
        })
        .catch(() => hit);
      return hit || jaringan;
    })
  );
});
