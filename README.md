# FinClub Online

Vue 3 + Quasar CLI (Vite), Android/iOS через Capacitor. Подробности мобильных функций: [MOBILE_SETUP.md](MOBILE_SETUP.md), проверки камеры и push: [ANDROID_VERIFICATION.md](ANDROID_VERIFICATION.md), контракт push: [PUSH_PAYLOAD.md](PUSH_PAYLOAD.md).

## Окружение

Нужны Node.js `^22.22.0 || >=24.11.0`, JDK 21 и Android SDK. Android Studio для сборки через терминал запускать не требуется.

На этом Mac сборка выполнялась с таким окружением (пути на другом компьютере замените):

```sh
export PATH="/private/tmp/finclub-node-runtime/node_modules/.bin:$PATH"
export JAVA_HOME="$HOME/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

Node в `/private/tmp` — временная установка. Если он удалён, установите совместимый Node обычным способом. `ANDROID_HOME` общий для Android-проектов; отдельная переменная на каждый проект не нужна.

Из корня проекта при первой настройке:

```sh
npm ci
(cd src-capacitor && npm ci)
```

Нужны локальный `.env` с API/Firebase и Android-конфиг `src-capacitor/android/app/google-services.json`. Импорт конфигов описан в MOBILE_SETUP.md. Секреты не коммитить.

## Upload-ключ для Google Play

Для первой публикации 30 октября 2026 создан отдельный RSA 3072 upload-ключ, срок 10000 дней. Это не debug-ключ. Google Play App Signing подписывает устанавливаемые пользователям APK своим app signing key, а этот upload-ключ используется для загрузки AAB.

На этом Mac файлы находятся **вне репозитория**:

- Ключ: `~/.config/finclub/android-signing/finclub-upload.jks`.
- Alias (имя ключа вместо «логина»): `finclub-upload`.
- Приватные настройки и пароли: `~/.config/finclub/android-signing/upload.properties`.
- Публичный сертификат: `~/.config/finclub/android-signing/upload-certificate.pem`.

Каталог имеет права 700, ключ и настройки — 600. В `upload.properties` записаны `storeFile`, `storePassword`, `keyAlias`, `keyPassword`. При первоначальном создании оба пароля одинаковые, случайные; они не записаны в исходники или этот README. Это пароли ключа, а не Google-аккаунта.

Найти файлы и открыть каталог в Finder:

```sh
ls -la "$HOME/.config/finclub/android-signing"
open "$HOME/.config/finclub/android-signing"
```

Посмотреть alias и пароли **локально в своём терминале**:

```sh
cat "$HOME/.config/finclub/android-signing/upload.properties"
```

Не пересылайте вывод этой команды и не добавляйте файл в Git. Сделайте защищённую резервную копию ключа и настроек в отдельном месте; это единственная созданная здесь копия. Публичный PEM паролей не содержит.

### Команда создания ключа через терминал

Ниже воспроизводимый интерактивный вариант для **нового приложения/нового ключа**. Уже созданный ключ FinClub повторно не создавайте и не заменяйте. Пароли вводятся в запросах `keytool`, не в командной строке:

```sh
mkdir -p "$HOME/.config/finclub/android-signing"
chmod 700 "$HOME/.config/finclub/android-signing"
umask 077
"$JAVA_HOME/bin/keytool" -genkeypair \
  -keystore "$HOME/.config/finclub/android-signing/finclub-upload.jks" \
  -storetype JKS \
  -alias finclub-upload \
  -keyalg RSA -keysize 3072 -validity 10000 \
  -dname "CN=FinClub Online Upload"
```

Фактически при автоматической подготовке использовались те же параметры, а случайный пароль передавался через временную переменную окружения с `-storepass:env` и `-keypass:env`, без вывода в лог и без пароля в аргументах процесса. Приватный `upload.properties` был создан с правами 600. Для самостоятельной настройки создайте такой файл вне проекта:

```properties
storeFile=/absolute/path/to/finclub-upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=finclub-upload
keyPassword=YOUR_KEY_PASSWORD
```

Проверка ключа и экспорт публичного сертификата (пароль запросится интерактивно):

```sh
"$JAVA_HOME/bin/keytool" -list -v \
  -keystore "$HOME/.config/finclub/android-signing/finclub-upload.jks" \
  -alias finclub-upload
"$JAVA_HOME/bin/keytool" -exportcert -rfc \
  -keystore "$HOME/.config/finclub/android-signing/finclub-upload.jks" \
  -alias finclub-upload \
  -file "$HOME/.config/finclub/android-signing/upload-certificate.pem"
```

## Как собраны release AAB и APK

Из корня проекта, после настройки окружения выше:

```sh
npm run typecheck
npm run test:mobile
npm run prepare:android
export FINCLUB_ANDROID_SIGNING_PROPERTIES="$HOME/.config/finclub/android-signing/upload.properties"
cd src-capacitor/android
./gradlew :app:testReleaseUnitTest :app:bundleRelease :app:assembleRelease --console=plain
cd ../..
```

`prepare:android` собирает production веб-интерфейс и синхронизирует его с Capacitor. Поэтому AAB/APK не требуют запущенного dev-сервера. API и Firebase требуют интернета. Release-подпись берётся только из внешнего файла, путь к которому указан в `FINCLUB_ANDROID_SIGNING_PROPERTIES`. Без него команды release завершаются ошибкой, чтобы не выдать неподписанный файл за готовый.

Исходные результаты Gradle:

- Google Play: `src-capacitor/android/app/build/outputs/bundle/release/app-release.aab`.
- Прямая установка: `src-capacitor/android/app/build/outputs/apk/release/app-release.apk`.

Копии для передачи:

- `dist/google-play/finclub-online-1.0.2-release.aab`.
- `dist/google-play/finclub-online-1.0.2-release.apk`.
- Публичный upload-сертификат и `BUILD_INFO.txt` с контрольными суммами.

Копирование после сборки (из корня проекта):

```sh
mkdir -p dist/google-play
cp src-capacitor/android/app/build/outputs/bundle/release/app-release.aab dist/google-play/finclub-online-1.0.2-release.aab
cp src-capacitor/android/app/build/outputs/apk/release/app-release.apk dist/google-play/finclub-online-1.0.2-release.apk
cp "$HOME/.config/finclub/android-signing/upload-certificate.pem" dist/google-play/
shasum -a 256 dist/google-play/*.aab dist/google-play/*.apk
```

Текущие параметры в `src-capacitor/android/app/build.gradle`: `applicationId=ru.finclubonline`, `versionCode=3`, `versionName=1.0.2`. Target/compile SDK — 36, min SDK — 24. Перед следующей загрузкой увеличьте `versionCode` относительно уже загруженного в Play Console; при необходимости обновите `versionName`.

Проверка подписи AAB и APK:

```sh
"$JAVA_HOME/bin/jarsigner" -verify src-capacitor/android/app/build/outputs/bundle/release/app-release.aab
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose --print-certs \
  src-capacitor/android/app/build/outputs/apk/release/app-release.apk
```

Для этой сборки также прошли `bundletool 1.18.1 validate`, проверка APK через `zipalign -c -P 16 -v 4`, проверка ELF alignment всех 12 native-библиотек (не менее 16 KB). В AAB указано `PAGE_ALIGNMENT_16K`. `jarsigner` подтверждает подпись, но выводит предупреждения о self-signed сертификате и порядке ZIP/JAR entries; проверка структуры через bundletool успешна. Токен пользователя и приватные файлы подписи в APK/AAB не обнаружены. Установка именно этой release-сборки на устройство ещё не проверена; после загрузки проверьте её через внутреннее тестирование Google Play.

Установка release APK на подключённое устройство:

```sh
"$ANDROID_HOME/platform-tools/adb" install -r dist/google-play/finclub-online-1.0.2-release.apk
```

Установленный раньше debug APK подписан другим ключом: Android не даст обновить его release APK поверх. Используйте отдельное устройство/эмулятор либо самостоятельно удалите старое приложение (это удалит его локальные данные), затем установите release. APK из Google Play также может иметь другую подпись благодаря Play App Signing.

## Загрузка в Google Play Console

1. Создать приложение в своём аккаунте Play Console и включить Play App Signing; для первой публикации можно выбрать генерацию app signing key на стороне Google.
2. Открыть внутреннее тестирование и создать релиз.
3. Загрузить **AAB** `dist/google-play/finclub-online-1.0.2-release.aab`, добавить описание изменений. APK — для прямой проверки, в консоль загружается AAB.
4. Проверить отчёт обработки AAB/предрелизные проверки и протестировать установку через Google Play. При необходимости добавить SHA-256 сертификата **app signing** из Play Console в настройки Android-приложения Firebase (он отличается от upload-сертификата).
5. Заполнить карточку магазина, политику конфиденциальности, Data safety, возрастной рейтинг, сведения о доступе к приложению для ревью и остальные обязательные разделы, которые запросит консоль. Требования тестирования зависят от типа аккаунта и показываются в консоли.

Эта подготовка не загружает и не публикует приложение автоматически. Ключ, файл с паролями и `dist/android/auth-token.txt` не отправлять вместе со сборкой. Каталог `dist/google-play` предназначен для передачи артефактов без приватного ключа и паролей.

Официальная документация: [подпись Android](https://developer.android.com/studio/publish/app-signing), [загрузка App Bundle](https://developer.android.com/studio/publish/upload-bundle), [Quasar Capacitor](https://quasar.dev/quasar-cli-vite/developing-capacitor-apps/introduction).

## Перенос на другой Mac и сборка iOS

Скачайте ZIP ветки `feat/quasar-clean-init` в GitHub (Code → Download ZIP) или клонируйте её:

```sh
git clone --branch feat/quasar-clean-init https://github.com/develeperaul/tg-miniapp-vue.git
cd tg-miniapp-vue
```

Для ZIP откройте в терминале распакованную папку. В Git есть исходники Android и iOS; готовые APK/AAB и приватные ключи не хранятся.

На другом Mac нужны Xcode 26+ с компонентами iOS и совместимый Node (см. выше). Передайте отдельно текущий `.env` и `GoogleService-Info.plist`; либо создайте `.env` из `.env.example` и заполните настройки. Firebase plist поместите в `src-capacitor/ios/App/App/GoogleService-Info.plist`. Токен авторизации переносить не нужно.

Из корня проекта:

```sh
npm ci
(cd src-capacitor && npm ci)
npm run typecheck
npm run test:mobile
npm run prepare:ios
open src-capacitor/ios/App/App.xcodeproj
```

`prepare:ios` собирает production веб-интерфейс и восстанавливает SwiftPM-зависимости/локальные ссылки Capacitor. Не копируйте `node_modules` или ссылки с другого компьютера.

В Xcode выберите target App → Signing & Capabilities, свой Apple Developer Team и automatic signing; bundle ID — `ru.finclubonline`. Дождитесь разрешения Swift Package dependencies. Выберите подключённый iPhone и Run. Для TestFlight выберите Any iOS Device → Product → Archive → Distribute App → App Store Connect. Для push нужны capability Push Notifications, APNs key в Firebase и entitlement/profile выбранного Team; подробности в MOBILE_SETUP.md и src-capacitor/NATIVE.md. Сборка iOS и реальные push на iPhone на текущем Mac ещё не подтверждены.

Для Android на другом компьютере дополнительно передайте `google-services.json`; для release также нужны приватный upload-ключ и его настройки через защищённый канал. Они не входят в ZIP из GitHub.
