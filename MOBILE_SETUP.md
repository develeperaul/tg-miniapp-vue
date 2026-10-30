# FinClub Online — Android и iOS

Практическая инструкция: [как запускали эмулятор без Android Studio и проверяли камеру и Firebase push](ANDROID_VERIFICATION.md).

Существующее Vue 3 приложение запускается через Quasar CLI и Capacitor 8.
Идентификатор на обеих платформах: `ru.finclubonline`, название: `FinClub Online`.

## Подготовка

Нужен Node.js 22.22+ или 24.11+. Для Android: Android Studio 2025.2.1+, SDK 36 и совместимый JDK (рекомендуется встроенный в Android Studio). Для iOS: macOS и Xcode 26+.

```sh
npm ci
(cd src-capacitor && npm ci)
npm run firebase:import -- '/path/google-services.json' '/path/GoogleService-Info.plist'
npm run icons:mobile
```

Импорт проверяет Android package, iOS bundle ID и совпадение Firebase проекта. Эти конфиги лежат локально в `src-capacitor/android/app/google-services.json` и `src-capacitor/ios/App/App/GoogleService-Info.plist`, исключены из Git; на другой машине их нужно импортировать снова. `.env` также остаётся локальным: требуется существующая настройка API и Firebase для web.

## Запуск и сборка

```sh
npm run dev             # браузер
npm run dev:android     # устройство/эмулятор Android
npm run dev:ios         # устройство/симулятор iOS
npm run prepare:android # production web bundle + cap sync, без APK
npm run prepare:ios     # production web bundle + cap sync, без IPA
npm run build:android   # нативная сборка
npm run build:ios       # нативная сборка; нужны настройки подписи
```

Для Android должен быть доступен SDK через `ANDROID_HOME` или локальный `src-capacitor/android/local.properties`. Для подключения физического устройства к dev-серверу оно должно иметь доступ к компьютеру по сети. Release APK/AAB и IPA требуют своих настроек подписи. Перед релизной сборкой выполните production prepare, чтобы исключить адрес dev-сервера.

## Камера

На нативных платформах нажатие «Документ» открывает системный Action Sheet: «Камера», «Галерея», «Файлы (загрузки)», «Отмена». Отдельной кнопки камеры нет. В PDF-only формах доступен только выбор документов. Разрешение камеры запрашивается после выбора камеры, а не галереи. Снимок передаётся в существующий upload; отмена не загружает файл. iOS usage descriptions и подписи приложения — на русском. Язык внешних системных экранов камеры/файлов также зависит от настроек ОС.

Предпросмотр выбранного изображения сохраняет локальный blob URL до отправки/удаления/закрытия формы. Успешный upload сохраняет серверный UUID, но не заменяет картинку приватным временным URL сервера. Загрузка ограничена 60 секундами; формы не отправляются до её завершения. Это исправляет превью выбранного файла, но не устраняет серверный HTTP 403 при последующем открытии временного media по удалённому URL.

## Push

Формат `message` / `chat_id`, совместимость со вложенным JSON и пример серверного FCM payload: [PUSH_PAYLOAD.md](PUSH_PAYLOAD.md).

Используется `@capacitor-firebase/messaging`: получает **FCM token на Android и iOS** и передаёт его существующему `firebase/token` API после входа. Отдельный `@capacitor/push-notifications` не установлен, чтобы не смешивать APNs и FCM токены на iOS. Web Firebase messaging сохраняется для браузера, в нативном приложении service worker не регистрируется.

Для iOS требуется Apple Developer team/provisioning с Push Notifications и APNs authentication key/certificate, загруженный в Firebase Console для этого приложения. `GoogleService-Info.plist` не заменяет APNs-ключ. Проверять реальную доставку нужно на устройстве. Android notification channel: `messages`; серверу следует отправлять `android.notification.channel_id = messages`, icon: `ic_stat_finclub`. iOS применяет иконку приложения, отдельной status-bar иконки не требуется.

Автотесты используют mocks нативного моста и не доказывают доставку push или работу физической камеры. На устройстве проверить: вход → разрешение push → foreground/background/закрытое приложение → нажатие push → нужный диалог; выход/смена аккаунта; камера → разрешить/отказать/отменить → загрузить снимок. Сервер должен разрешать API из origin Capacitor (`capacitor://localhost` для iOS, `https://localhost` для Android), иначе CORS заблокирует запросы.

## Иконки и проверки

Исходник иконки приложения: `assets/mobile/app-icon.png` (существующий FinClub). Push: `assets/mobile/push-icon.svg` и PNG — белый знак FC на прозрачном фоне. Профили Quasar Icon Genie: `icongenie-app.json`, `icongenie-push.json`; размеры и пути воспроизводимы.

```sh
npm run icons:verify
npm run test:mobile
npm run typecheck
npm run build
```

Документация: [Quasar Capacitor](https://quasar.dev/quasar-cli-vite/developing-capacitor-apps/introduction/), [команды сборки](https://quasar.dev/quasar-cli-vite/developing-capacitor-apps/build-commands/), [Icon Genie](https://quasar.dev/icongenie/command-list/), [Capacitor environment](https://capacitorjs.com/docs/getting-started/environment-setup), [Camera](https://capacitorjs.com/docs/apis/camera), [Firebase Messaging plugin](https://capawesome.io/docs/sdks/capacitor/firebase/cloud-messaging/).

## Проверка 14 октября 2026

Независимый тестировщик подтвердил 14/14 mobile unit tests и typecheck без ошибок после исправлений. SPA build, production prepare для Android/iOS и проверка Icon Genie прошли. Проверка авторизации реальным токеном не подтверждена: сетевые запросы не получили HTTP-ответа; временный файл токена удалён.

Нативные APK/IPA пока не подтверждены. Android сборка с временным JDK 21 дошла до native build tasks, но была остановлена на контрольной точке лимита. iOS требует обновления Xcode до 26+, доступного SwiftPM cache и настройки подписи/APNs. Следующий шаг — завершить Android сборку и проверить приложение на устройствах; mocks камеры и push этого не заменяют.

Финальная повторная production prepare после всех исправлений прошла для обеих платформ. Quasar dev-сервер проверен отдельно: localhost вернул HTTP 200; сервер затем остановлен. Отрисовка и вход в браузере с реальным токеном остаются непроверенными.

## Итог проверки 15 октября 2026

**Android debug APK собран и подписан**, установлен и запущен на Android API 37 эмуляторе Small_Phone с Google Play Services. Выдаваемый файл: `dist/android/finclub-online-debug.apk` (SHA-256 `e5a0e363e4de8b1c9404d271ea150d8e2242061e5bddcdf7d1480707e73c8792`). Это тестовая debug-подпись, не релиз для Play Store.

Независимый тестировщик принял **45/45 тестов**, без TODO/skip; typecheck прошёл. Исправлены повторная idle-блокировка PIN, восстановление результата камеры после завершения Android-процесса, гонка выхода из аккаунта во время съёмки; камера скрыта в PDF-only формах. Регистрация push ограничена таймаутом 15 секунд. Фото после восстановления принимается только явным действием пользователя для исходной страницы, слота и аккаунта.

Нативные проверки:

- Переданный пользователем auth-токен: `profile` и `employees` HTTP 200. Настоящая форма APK прошла вход до экрана установки PIN. PIN не создавался и не изменялся.
- Камера: настоящая Android Camera activity сняла виртуальную сцену эмулятора; plugin вернул JPEG, 28 888 байт, локальный URI прочитан с HTTP 200. Отмена съёмки обработана. Тестовый JPEG загружен через существующий XHR/FormData в `temp-media`: HTTP 201, корректные uuid/url; сообщений в чаты не отправляли. Полный маршрут от кнопки формы после установки PIN не проверялся вручную; компонентные сценарии проверены автотестами.
- Firebase: permission dialog → granted; настоящий FCM-токен эмулятора; адресные test sends через Firebase Console только на это устройство. Foreground `notificationReceived` подтверждён; background push виден в Android notification shade; нажатие вызвало `notificationActionPerformed`, `actionId=tap`, и открыло APK. Deep-link конкретного диалога не входил в тестовый payload.
- API и SSE: production CSP ранее разрешала только self и блокировала внешние соединения. Исправлены connect/img/frame allowlist для нормализованного API-origin и точных Firebase endpoints. Обычный WebView fetch вернул HTTP 200, EventSource открылся. Временный CapacitorHttp patch **отключён**, обычные fetch/XHR сохранены. Опасные origin-делимитеры отклоняются, HTML-интерполяция экранирована.
- Иконки SPA/Capacitor и Android push сгенерированы и проверены.

Снимки подтверждения находятся в `dist/android-smoke/`. Auth-токен отсутствует в APK; тестовая авторизация и FCM-токен эмулятора очищены. Физическое устройство и iOS-бинарник не проверялись; для iOS по-прежнему нужен Xcode 26+, подпись Apple и APNs-настройка.

### Серверный блокер предпросмотра временных вложений

В выдаваемом APK обычный XHR/FormData также подтверждён: нейтральная тестовая PNG загружена с HTTP 201 и корректным uuid. Но URL из ответа `temp-media` под `/storage/temporaries/...` возвращает **HTTP 403 и HTML**, с Authorization и без него. WebView блокирует такой ответ как изображение (`ERR_BLOCKED_BY_ORB`); программное чтение также не проходит CORS. Это серверная доступность временного media, не ошибка камеры или CSP. Требуется проверить backend/хостинг `/storage/temporaries` и контракт доступа к временным файлам; настройки сервера в этом репозитории отсутствуют. Не ослаблять ORB/CORS и не включать глобальный native HTTP patch для обхода такого ответа. Предпросмотр серверного вложения считается **непройденным**; локальный снимок и сама загрузка прошли.

Финальная повторная проверка выдаваемого APK после исправления синтаксиса шаблонизатора Quasar: API-origin присутствует в упакованном HTML, вход достигает PIN, profile HTTP 200, обычный fetch и SSE open. 45/45 автотестов, typecheck и SPA build прошли. APK debug-подпись действительна. Тестовая авторизация/FCM очищены, эмулятор остановлен, автоматизация переведена в PAUSED. Полный сброс данных приложения не выполнялся: автоматическая проверка разрешений отклонила `pm clear`, чтобы не удалить неподтверждённые данные эмулятора.
