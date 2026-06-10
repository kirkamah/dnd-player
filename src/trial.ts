/**
 * Пробная версия (trial). Флаг подставляется на сборке через Vite define
 * (__TRIAL__): полная сборка -> false, `npm run dist:trial` -> true.
 * Плеер в пробной версии НЕ ограничен по функциям — это просто бесплатная
 * раздача с пометкой и ссылкой на полный набор no harm org на Boosty.
 */
declare const __TRIAL__: boolean;

export const IS_TRIAL: boolean = __TRIAL__;

export const BOOSTY_URL = 'https://boosty.to/no.harm.org';
