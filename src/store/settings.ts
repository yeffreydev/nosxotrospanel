import { create } from 'zustand';

export type Locale = 'es' | 'qu' | 'en' | 'ay';

export const LOCALES: { value: Locale; label: string; native: string }[] = [
  { value: 'es', label: 'Español', native: 'Español' },
  { value: 'qu', label: 'Quechua', native: 'Runa Simi' },
  { value: 'en', label: 'English', native: 'English' },
  { value: 'ay', label: 'Aimara', native: 'Aymara' },
];

const LOCALE_VALUES: Locale[] = ['es', 'qu', 'en', 'ay'];

interface SettingsState {
  locale: Locale;
  sound: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  setSound: (on: boolean) => void;
  toggleSound: () => void;
}

const LOCALE_KEY = 'nx_locale';
const SOUND_KEY = 'nx_sound';

function readLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_KEY) as Locale | null;
    return v && LOCALE_VALUES.includes(v) ? v : 'es';
  } catch {
    return 'es';
  }
}

function readSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const useSettings = create<SettingsState>((set, get) => ({
  locale: readLocale(),
  sound: readSound(),
  setLocale: (locale) => {
    persist(LOCALE_KEY, locale);
    set({ locale });
  },
  toggleLocale: () => {
    const cur = LOCALE_VALUES.indexOf(get().locale);
    const next = LOCALE_VALUES[(cur + 1) % LOCALE_VALUES.length];
    persist(LOCALE_KEY, next);
    set({ locale: next });
  },
  setSound: (on) => {
    persist(SOUND_KEY, on ? 'on' : 'off');
    set({ sound: on });
  },
  toggleSound: () => {
    const next = !get().sound;
    persist(SOUND_KEY, next ? 'on' : 'off');
    set({ sound: next });
  },
}));
