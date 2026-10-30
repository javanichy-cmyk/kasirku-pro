/* KasirKu service worker — membuat aplikasi bisa dibuka tanpa internet.
   Naikkan VERSION setiap kali Anda mengganti file index.html agar cache lama dibersihkan. */
const VERSION='kasirku-v1';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-512-maskable.png','./icons/apple-touch-icon.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

const put=(req,res)=>caches.open(VERSION).then(c=>c.put(req,res));

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  // Halaman aplikasi: tampilkan versi tersimpan seketika (cepat & offline), lalu perbarui diam-diam di latar belakang.
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      const cached=await caches.match('./index.html');
      const refresh=fetch(req).then(res=>{if(res&&res.ok)put('./index.html',res.clone());return res}).catch(()=>null);
      if(cached){e.waitUntil(refresh);return cached}
      const res=await refresh;
      return res||new Response('Aplikasi belum tersimpan untuk mode offline. Buka sekali dengan internet.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    })());
    return;
  }

  // File milik aplikasi sendiri (ikon, manifest): cache dulu.
  if(url.origin===location.origin){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok)put(req,res.clone());return res})));
    return;
  }

  // Pustaka dari CDN (Excel, pemindai barcode): setelah dimuat sekali, tersedia offline.
  if(/(^|\.)cdn\.jsdelivr\.net$|(^|\.)cdnjs\.cloudflare\.com$/.test(url.host)){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok||res.type==='opaque')put(req,res.clone());return res})));
  }
});
