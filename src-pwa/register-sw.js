// Install the single Quasar-built Firebase + Workbox service worker.
// setupFirebaseMessaging() reuses this registration when requesting an FCM token.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .catch(error => console.error('Service worker registration failed:', error))
  })
}
