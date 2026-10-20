// Service worker MEX
// Strategi: file aplikasi (satu origin) selalu dicek ke jaringan lebih dulu agar update
// dari GitHub langsung terpakai; cache hanya sebagai cadangan saat offline.
// Permintaan ke origin lain (Apps Script, Google Sheets, CDN, foto GitHub raw) TIDAK disentuh.
// File APK (folder download/) juga tidak disentuh, supaya tidak memenuhi cache.
// Naikkan CACHE setiap kali ikon atau manifest diganti.
const CACHE = 'mex-shell-v2';
const SHELL = [
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
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))   // satu file gagal tidak membatalkan pemasangan
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/download/') !== -1) return;   // file APK: langsung ke jaringan

  e.respondWith(
    fetch(req.url, { cache: 'no-cache' })
      .then(res => {
        if (res && res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req.url, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req.url, { ignoreSearch: true })
          .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : null))
          .then(r => r || Response.error())
      )
  );
});
