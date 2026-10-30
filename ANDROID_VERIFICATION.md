# Как запускали Android и проверяли нативные функции

Проверка 15 октября 2026 года: debug APK `dist/android/finclub-online-debug.apk`, приложение `ru.finclubonline`, AVD `Small_Phone` с Google Play Services. Ниже описаны фактическая проверка и способ её повторить. Токены в документ не включены.

## 1. Почему эмулятор работает без открытого проекта Android Studio

Android Studio — IDE. Сам эмулятор — отдельная программа Android SDK, а AVD — сохранённая конфигурация виртуального устройства. Уже созданный AVD можно запускать из терминала; открывать проект в IDE для этого не требуется. APK устанавливается через отдельную SDK-утилиту `adb`.

На этом Mac SDK находится в `~/Library/Android/sdk`. Команды из корня репозитория:

```sh
export FINCLUB_ANDROID_SDK="$HOME/Library/Android/sdk"
"$FINCLUB_ANDROID_SDK/emulator/emulator" -list-avds
"$FINCLUB_ANDROID_SDK/emulator/emulator" -avd Small_Phone -memory 3072 -gpu swiftshader -no-snapshot -no-boot-anim -no-audio
```

Последняя команда держит процесс эмулятора в текущем терминале. Для следующих команд откройте второй терминал и задайте там ту же переменную. В первоначальной автоматической проверке дополнительно использовался `-no-window`: Android работал без окна, взаимодействие шло через ADB и отладочный WebView. При запуске для просмотра пользователем этот флаг убран.

3072 МБ памяти и программный GPU `swiftshader` выбраны после зависаний SystemUI на исходной конфигурации с 1 ГБ памяти. `-no-snapshot` запускает систему без восстановления снимка состояния; данные приложения он не стирает.

```sh
export FINCLUB_ANDROID_SDK="$HOME/Library/Android/sdk"
"$FINCLUB_ANDROID_SDK/platform-tools/adb" devices
"$FINCLUB_ANDROID_SDK/platform-tools/adb" -s emulator-5554 wait-for-device
"$FINCLUB_ANDROID_SDK/platform-tools/adb" -s emulator-5554 shell getprop sys.boot_completed
```

Дождитесь значения `1` и окончания загрузки Android. Если устройств несколько, используйте серийный номер нужного из `adb devices` вместо `emulator-5554`.

```sh
"$FINCLUB_ANDROID_SDK/platform-tools/adb" -s emulator-5554 install -r dist/android/finclub-online-debug.apk
"$FINCLUB_ANDROID_SDK/platform-tools/adb" -s emulator-5554 shell am start -n ru.finclubonline/.MainActivity
```

Для повторного открытия уже установленного приложения достаточно последней команды. Сборка APK также не требует IDE: production web bundle готовился через `npm run prepare:android`, затем запускался Gradle wrapper `:app:assembleDebug` с JDK 21. Подробности окружения — в `src-capacitor/NATIVE.md`.

## Сборка автономного debug APK

Файл `dist/android/finclub-online-debug.apk` появился в два этапа: Quasar собрал веб-интерфейс и синхронизировал Capacitor, затем Gradle собрал нативный APK. Я скопировал результат Gradle в `dist/android` под удобным именем. Этот путь не является стандартным выходом команды Quasar.

Один раз подготовьте зависимости, локальную `.env` и Firebase-конфиги по `MOBILE_SETUP.md`. Далее из корня проекта:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="/private/tmp/finclub-jdk21/Contents/Home"
export PATH="/private/tmp/finclub-node-runtime/node_modules/.bin:$PATH"
export GRADLE_USER_HOME="/private/tmp/finclub-gradle-home"

npm run prepare:android
```

Здесь пути `/private/tmp/finclub-*` — временные Node/JDK/cache, использованные на этом Mac. Если они удалены, используйте установленный Node 22.22+ или 24.11+ и укажите свой JDK 21 в `JAVA_HOME`; отдельный `GRADLE_USER_HOME` необязателен. JDK 25 не подходит текущему Gradle wrapper.

После успешного prepare:

```sh
(cd src-capacitor/android && ./gradlew :app:assembleDebug --console=plain)
mkdir -p dist/android
cp src-capacitor/android/app/build/outputs/apk/debug/app-debug.apk dist/android/finclub-online-debug.apk
```

Каждую следующую команду выполняйте только после успешного завершения предыдущей. Установка и открытие в уже запущенном эмуляторе:

```sh
"$ANDROID_HOME/platform-tools/adb" -s emulator-5554 install -r dist/android/finclub-online-debug.apk
"$ANDROID_HOME/platform-tools/adb" -s emulator-5554 shell am start -n ru.finclubonline/.MainActivity
```

В этом APK production-сборка веб-интерфейса, упакованная внутрь приложения, и debug-подпись Android. Он не требует работающего Vite-сервера, но API и Firebase требуют интернета. Изменения исходников попадут в него только после повторной сборки и установки. Это не подписанный release для магазина.

## Dev-режим: изменения кода сразу в Android

В dev-режиме нативное приложение загружает интерфейс с dev-сервера Quasar на Mac. Изменения Vue/CSS/TypeScript обновляются через HMR; камеру и push по-прежнему выполняют настоящие нативные плагины. Простой `npm run dev` открывает браузер и не проверяет Android-плагины.

1. Запустите эмулятор по разделу 1. Вместо `FINCLUB_ANDROID_SDK` можно использовать общий `ANDROID_HOME` с тем же путём.
2. Подготовьте Node/JDK/SDK, как в разделе сборки. Из корня проекта выполните:

   ```sh
   npm run dev:android
   ```

3. Дождитесь dev-сервера и синхронизации Capacitor. Эта команда по стандартному сценарию Quasar откроет Android Studio для `src-capacitor/android`. В проекте задан порт **5173**; актуальный адрес смотрите в выводе Quasar.
4. В Android Studio выберите Gradle JDK 21, дождитесь Gradle sync, выберите конфигурацию `app`, устройство `Small_Phone` и нажмите Run. При предложении обновить Gradle не меняйте версии автоматически.
5. Оставьте терминал Quasar работающим. Измените текст или стиль Vue-компонента и проверьте обновление на экране эмулятора. При остановке dev-сервера dev-приложение теряет источник интерфейса.

### Установка dev APK через терминал

Если удобнее устанавливать без кнопки Run, оставьте `npm run dev:android` работающим и дождитесь окончания его sync. Во втором терминале с теми же переменными окружения:

```sh
(cd src-capacitor/android && ./gradlew :app:assembleDebug --console=plain)
"$ANDROID_HOME/platform-tools/adb" -s emulator-5554 install -r src-capacitor/android/app/build/outputs/apk/debug/app-debug.apk
"$ANDROID_HOME/platform-tools/adb" -s emulator-5554 shell am start -n ru.finclubonline/.MainActivity
```

В этом случае APK содержит dev-конфигурацию, подготовленную работающим Quasar. Не запускайте `prepare:android` параллельно с dev: он готовит автономную production-конфигурацию. Не копируйте dev APK поверх выдаваемого автономного файла в `dist/android`.

Если экран пустой или сервер недоступен, проверьте адрес в выводе Quasar и доступность Mac из Android. `localhost` внутри Android означает само устройство, а не Mac. Для Android Emulator адрес хоста обычно `10.0.2.2`; на физическом устройстве нужен доступный LAN-адрес Mac. При необходимости задайте достижимый адрес через `npm run dev:android -- --host <LAN-IP-Mac>`. Сам адрес `0.0.0.0` не является адресом для подключения. Не записывайте dev `server.url` в постоянную production-конфигурацию.

После изменения нативных плагинов, Android manifest или Java-кода нужен повторный sync/сборка/установка; HMR этого не заменяет. После окончания dev остановите Quasar и повторите автономную сборку выше, если нужен APK без зависимости от сервера. Dev и автономная сборка имеют одинаковый applicationId, поэтому установка одной обновляет другую.

Dev-сценарий здесь описан по установленному Quasar и официальной документации; в рамках изменения этой инструкции повторный dev-запуск не выполнялся. Проверки камеры/push ниже проводились на автономном debug APK.

## 2. Как проверялась камера

Это была настоящая Camera activity Android внутри эмулятора, а изображение поступало от эмулируемой камеры. Это проверка нативного плагина, но не физической камеры телефона.

Поскольку после авторизации приложение требовало создать PIN, новый PIN не задавался. Для проверки плагина использовался отладочный WebView установленного debug APK: через Chrome DevTools Protocol вызывался нативный Capacitor-мост Camera с `source: 'CAMERA'`, `resultType: 'uri'`, `saveToGallery: false`. Открывшаяся системная камера управлялась через Android SDK. Это не был mock и не было прохождением всей формы загрузки вручную.

Последовательность проверки:

1. Вызвать Camera plugin в запущенном APK; дождаться Android Camera activity.
2. Сохранить экран камеры, нажать затвор и подтвердить снимок в системном интерфейсе.
3. Дождаться результата плагина: локального URI фотографии.
4. Прочитать URI из WebView. Получен JPEG: **28 888 байт**, `image/jpeg`, HTTP **200** при чтении локального URI.
5. Загрузить этот файл существующим XHR/FormData в `temp-media`: HTTP **201**, в ответе присутствовали UUID и URL. Сообщения в чаты не отправлялись.
6. Отдельно открыть камеру повторно и отменить съёмку: подтверждён callback отмены.

Для повторной ручной проверки после самостоятельной установки PIN откройте форму, допускающую изображения, нажмите кнопку камеры у вложения, сделайте и подтвердите снимок. Затем повторите с отменой. В PDF-only формах кнопка камеры намеренно скрыта. Реализация: `src/composables/useNativeCamera.ts` и `src/components/FileTile.vue`.

Источник изображения задаётся настройками AVD Camera. В проверенном `~/.android/avd/Small_Phone.avd/config.ini` задняя камера настроена как `hw.camera.back = virtualscene`, передняя — `hw.camera.front = emulated`. Картинка в `dist/android-smoke/camera-preview.png` сама по себе доказывает только открытый экран камеры. Возврат JPEG и успешная загрузка проверялись отдельно по результатам вызовов.

**Ограничение:** URL временного вложения, возвращённый сервером, отдаёт HTTP **403** и HTML. Поэтому серверный предпросмотр изображения не прошёл. Захват, локальное чтение и загрузка прошли. Полный сценарий от кнопки формы после PIN ещё требует ручной проверки.

## 3. Как проверялась настоящая доставка Firebase push

Использовался Firebase-проект `spgmarket-1499484215126`, соответствующий локальному Android-конфигу приложения. На эмуляторе были Google Play Services и сетевое соединение. Уведомление пришло через FCM; локальная имитация уведомления и широкая рассылка не использовались.

1. В установленном APK разрешить уведомления в системном диалоге Android.
2. Через установленный нативный `@capacitor-firebase/messaging` получить **FCM registration token именно этого эмулятора**. В фактической проверке для этого и для наблюдения событий использовался отладочный WebView/Capacitor-мост. Auth-токен пользователя и FCM-токен устройства — разные вещи.
3. В авторизованной Firebase Console открыть Messaging, подготовить notification с заголовком `FinClub Android smoke 15.10.2026` и текстом `Тест доставки только на эмулятор разработки.`
4. Выбрать **Send test message / Test on device**, вставить текущий FCM-токен эмулятора и отправить тест только на него. Не запускать кампанию и не выбирать аудиторию пользователей.
5. С открытым приложением подтвердить событие `notificationReceived` нативного плагина. Это проверка foreground-доставки; она не равнозначна системной карточке в шторке.
6. Увести приложение в фон кнопкой Home, повторить адресную тестовую отправку. Открыть шторку Android и проверить карточку FinClub с ожидаемыми заголовком и текстом. Сохранён кадр `dist/android-smoke/background-push.png`.
7. Нажать карточку: подтверждено открытие APK и событие `notificationActionPerformed` с `actionId: 'tap'` и идентификатором уведомления.

Для повтора нужен новый актуальный FCM-токен: после проверки тестовая авторизация очищена, вызваны `FirebaseMessaging.deleteToken()` и `removeAllDeliveredNotifications()`. Токен не сохранялся в репозитории и не приводится в логах инструкции.

Код регистрации, канала `messages` и обработчиков находится в `src/composables/useNativeMessaging.ts`. Проверка адресной отправкой из Firebase Console подтверждает доставку FCM на клиент; она не доказывает отправку push вашим backend по бизнес-событию. Переход в конкретный диалог не проверялся: тестовое сообщение не содержало такого deep-link. Доставка на физический Android и iOS также ещё не подтверждена.

## 4. Скриншоты и границы доказательств

```sh
mkdir -p dist/android-smoke
"$FINCLUB_ANDROID_SDK/platform-tools/adb" -s emulator-5554 exec-out screencap -p > dist/android-smoke/current-launch.png
```

Меняйте имя файла для каждого этапа. Для камеры снимайте экран до затвора, для push — открытую шторку после реального сообщения. Не снимайте экран с видимыми токенами.

Сохранённые кадры в этом рабочем каталоге:

- `dist/android-smoke/current-launch.png` — свежий повторный запуск, пустая форма авторизации.
- `dist/android-smoke/auth-pin.png` — результат входа с предоставленным токеном, экран создания PIN; PIN не создавался.
- `dist/android-smoke/camera-preview.png` — открытая системная камера с виртуальным изображением.
- `dist/android-smoke/background-push.png` — доставленный адресный FCM push в системной шторке.

`dist/` — генерируемые локальные артефакты; наличие этих файлов в Git не предполагается. Скриншоты не заменяют проверку callback, содержимого файла и HTTP-ответов. Автотесты с mocks также не заменяют реальные нативные проверки.

## Официальная документация

- [Quasar: запуск Capacitor dev с HMR](https://quasar.dev/quasar-cli-vite/developing-capacitor-apps/preparation/)
- [Quasar: команды сборки Capacitor](https://quasar.dev/quasar-cli-vite/developing-capacitor-apps/build-commands/)

- [Запуск Android Emulator из командной строки](https://developer.android.com/studio/run/emulator-commandline)
- [Камера Android Emulator](https://developer.android.com/studio/run/emulator-use-camera)
- [Capacitor Camera](https://capacitorjs.com/docs/apis/camera)
- [Capacitor Firebase Messaging](https://capawesome.io/docs/sdks/capacitor/firebase/cloud-messaging/)
- [Firebase: тестовое уведомление Android](https://firebase.google.com/docs/cloud-messaging/android/get-started)
