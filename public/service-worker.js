
// SendPulse integration removed.
// This file is kept to prevent 404s for cached clients, but it performs no operations.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
