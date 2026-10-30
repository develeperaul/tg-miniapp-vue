import { readFile, copyFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [androidSource, iosSource] = process.argv.slice(2);
if (!androidSource || !iosSource) {
  console.error('Usage: npm run firebase:import -- /path/google-services.json /path/GoogleService-Info.plist');
  process.exit(1);
}
const android = JSON.parse(await readFile(androidSource, 'utf8'));
const ios = JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', resolve(iosSource)], { encoding: 'utf8' }));
const appId = 'ru.finclubonline';
if (!android.client?.some(client => client.client_info?.android_client_info?.package_name === appId)) {
  throw new Error(`Android Firebase config does not contain ${appId}`);
}
if (ios.BUNDLE_ID !== appId || ios.PROJECT_ID !== android.project_info?.project_id) {
  throw new Error('Firebase bundle ID or project does not match Android/iOS application');
}
for (const [source, relative] of [
  [androidSource, 'src-capacitor/android/app/google-services.json'],
  [iosSource, 'src-capacitor/ios/App/App/GoogleService-Info.plist'],
]) {
  const destination = resolve(root, relative);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(source), destination);
}
console.log('Firebase configurations imported for Android and iOS.');
