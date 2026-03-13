// composables/usePinCode.ts
const STORAGE_KEY = 'app_pin_code';
const AUTH_FLAG_KEY = 'pin_authenticated';
const FORCE_SET_KEY = 'force_pin_set'; // флаг, что нужно установить пин после авторизации

// Простая функция хеширования
const hashPin = (pin: string): string => {
  return btoa(pin + '_pin_salt');
};

export function usePinCode() {
  // Сохранить новый пин-код
  const savePin = (pin: string): void => {
    localStorage.setItem(STORAGE_KEY, hashPin(pin));
    // Снимаем флаг принудительной установки
    localStorage.removeItem(FORCE_SET_KEY);
  };

  // Проверить существующий пин-код
  const verifyPin = (pin: string): boolean => {
    const storedHash = localStorage.getItem(STORAGE_KEY);
    return storedHash === hashPin(pin);
  };

  // Проверить, установлен ли пин-код
  const hasPin = (): boolean => {
    return !!localStorage.getItem(STORAGE_KEY);
  };

  // Установить флаг, что нужно создать пин после авторизации
  const setForcePinSet = (): void => {
    localStorage.setItem(FORCE_SET_KEY, 'true');
  };

  // Проверить, нужно ли принудительно установить пин
  const shouldForcePinSet = (): boolean => {
    return localStorage.getItem(FORCE_SET_KEY) === 'true';
  };

  // Сбросить пин-код при выходе
  const resetPinOnLogout = (): void => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FORCE_SET_KEY);
    sessionStorage.removeItem(AUTH_FLAG_KEY);
    console.log('🔄 Пин-код сброшен при выходе');
  };

  // Сессионные флаги
  const setSessionAuthenticated = (value: boolean = true): void => {
    if (value) {
      sessionStorage.setItem(AUTH_FLAG_KEY, 'true');
    } else {
      sessionStorage.removeItem(AUTH_FLAG_KEY);
    }
  };

  const isSessionAuthenticated = (): boolean => {
    return sessionStorage.getItem(AUTH_FLAG_KEY) === 'true';
  };

  return {
    savePin,
    verifyPin,
    hasPin,
    shouldForcePinSet,
    setForcePinSet,
    resetPinOnLogout,
    setSessionAuthenticated,
    isSessionAuthenticated,
  };
}