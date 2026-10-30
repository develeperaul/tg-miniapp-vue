import { defineCapacitorConfig } from '@quasar/app-vite/capacitor';

export default defineCapacitorConfig({
  appId: 'ru.finclubonline',
  appName: 'FinClub Online',
  webDir: 'www',
  plugins: {
    FirebaseMessaging: { presentationOptions: ['badge', 'sound', 'alert'] }
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          '@capacitor-firebase/messaging': { symlink: true }
        }
      }
    }
  }
});
