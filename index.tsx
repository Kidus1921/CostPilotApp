
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker for Offline Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use relative path './service-worker.js' to ensure it resolves against the current origin,
    // avoiding "Origin mismatch" errors if the app is served via a proxy or subpath.
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        console.log('✅ ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        // We log as info/debug because in some preview environments (like AI Studio),
        // origin mismatch errors are expected and not critical for functionality.
        console.log('ℹ️ ServiceWorker registration info:', err.message || err);
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
