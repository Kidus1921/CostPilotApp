// importScripts('https://web.webpushs.com/sp-push-worker-fb.js?ver=2.0');

self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('Service Worker Installed');
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    console.log('Service Worker Activated');
});