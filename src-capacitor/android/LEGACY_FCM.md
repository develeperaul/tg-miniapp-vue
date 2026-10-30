# Legacy FCM notification body compatibility

The app-owned `ru.finclubonline.LegacyMessagingService` extends Capawesome's MessagingService.
It normalizes string extras before `super.handleIntent`, so Firebase itself creates the tray
notification and its click PendingIntent. The original Capawesome service is removed by the
manifest merger; token refresh and foreground callbacks stay inherited.

This is a legacy compatibility workaround, not a supported Firebase extension point.
Firebase Messaging is strictly pinned to **25.0.1**. Its versioned sources declare
`public void handleIntent(Intent)` with `@hide`; it can change or become final/disappear in
another release. Reinspect the actual resolved SDK source and test tray/click behavior before
upgrading. Overriding onMessageReceived alone cannot fix SDK-generated background notifications.
The 25.0.1 CommonNotificationBuilder copies non-reserved extras into the click Intent, including
our canonical `chat_id`. No notification is manually posted by this adapter.

Parser limits: 100,000 characters per JSON string and five nested data/body edges. Only objects
and JSON object strings are traversed, not arbitrary keys or arrays. Top-level explicit routing
wins, then nested explicit data, then SDK body JSON and generic body fallbacks. Canonical snake
case wins over camel case within each object. Root fields precede nested data, then nested body.
IDs accept nonempty strings or numbers. A nonempty string `message` inside recognized SDK body
JSON replaces that SDK body only; plain, malformed, oversized or unrecognized bodies stay intact.
Only canonical chat_id/message_id/url and the recognized SDK body are updated. Notification title,
channel, analytics and Firebase message ID remain untouched. gcm.n.body takes precedence over
legacy gcm.notification.body when both exist.

Delegation is disabled both in metadata (fresh initialization) and asynchronously in
MainActivity.onCreate (clears persisted Google Play services proxy delegation after an upgrade).
For an existing emulator/device, install with `adb install -r` to preserve data, then open the
updated app and allow the asynchronous Task to complete before background delivery testing.
Until that first launch/completion an already-enabled proxy may still bypass the service.
Already displayed notifications are not rewritten. Force-stopped apps still follow Android/FCM
normal delivery restrictions. No tokens or raw payloads are logged by this code.

Verification (JDK 21): `./gradlew :app:testDebugUnitTest :app:assembleDebug` from this directory.
Review the generated merged manifest for the app service, removed Capawesome service, and false
metadata. Device acceptance: after upgrading and launching once, background the app, send a real
notification with body `{"data":{"message":"test 8","chat_id":"019cb94e-73c1-710f-9208-cfef55ef91e8"}}`,
check tray text `test 8`, then tap and verify routing to that chat. Also check ordinary notifications
and explicit chat_id precedence. This real FCM send requires a valid sender and device registration;
a successful local build/parser test alone does not establish end-to-end delivery.
