
importScripts('https://web.webpushs.com/sp-push-worker-fb.js?ver=2.0');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
